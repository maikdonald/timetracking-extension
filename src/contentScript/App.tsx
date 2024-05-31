import parse from 'parse-duration'
import { useState, useEffect, useCallback } from 'react';


const WORKDAY_HOURS_DEFAULT = 8;

type PopupMessage = {
  type: string;
}

type CustomResponse = {responseCode: number};

type ContentScriptResponse = {
  (response: CustomResponse): void;
}

const getHumanTime = (msTime: number, includeBalanceSign: boolean) => {
  const parsedTime = parse(msTime.toString(),'m');
  const hours = Math.floor(Math.abs(parsedTime)/60);
  const mins = Math.abs(parsedTime)%60;
  const positiveOrNegative = includeBalanceSign ? (parsedTime < 0 ? '-' : (parsedTime > 0 ? '+' : '')) : '';

  if (hours > 0 && mins > 0){
    return `${positiveOrNegative}${hours} h ${mins} min`
  } else {
    if (hours > 0){
      return `${positiveOrNegative}${hours} h`
    } else {
      return `${positiveOrNegative}${mins} min`
    }
  }
}

const getTimetrackElements = () => document.body.querySelectorAll(".TimesheetSlat--clock:not(.TimesheetSlat--disabled)");

const getTimeTrackingElements = async() => {
  // TimesheetSlat__extraInfoItem--clockPush
  const daysOnTheMonth = getTimetrackElements();
  
  verifyHours(daysOnTheMonth)

  // We remove weekends, holidays, sick leaves, etc..
  // const workingDaysElementsToTheDate: Element[] = [];
  const timeTrackingElements: string[] = [];
  const todayDayNumber = new Date().getDate();
  const payrollPeriodMonthAbrv = document.body.querySelectorAll('.TimesheetSecondHeader h4')[0].innerHTML.replace(/^(.+)\s.+$/,"$1");
  
  const breedDayWorking = await chrome.storage.sync.get('workingOct12').then((localStorageVal) => Boolean(localStorageVal.workingOct12))

  const isThisPayPeriod = document.body.querySelectorAll(".TimesheetHeader__period .fab-SelectToggle__content")[0].innerHTML === 'This Pay Period'
  
  daysOnTheMonth.forEach(originalEl => {
    const dayOfWeekNumber = parseInt((originalEl?.querySelector(".TimesheetSlat__dayDate")?.innerHTML || "").replace(/[^0-9.]/g,"")) || null;
    if (dayOfWeekNumber && (!isThisPayPeriod || (isThisPayPeriod && dayOfWeekNumber <= todayDayNumber))){
      const dayOfWeekName = originalEl?.querySelector(".TimesheetSlat__dayOfWeek")?.innerHTML || "";
      const satOrSun = ["Sat", "Sun"].includes(dayOfWeekName);
      const paidLeave = Boolean(originalEl.querySelector(".TimesheetSlat__extraInfoItem"))
      const workingBreedDay = dayOfWeekNumber === 12 && payrollPeriodMonthAbrv === 'Oct' && breedDayWorking;
      if (workingBreedDay || (!satOrSun && !paidLeave)){
        // workingDaysElementsToTheDate.push(originalEl)
        const timeTrackingElement = originalEl?.querySelector(".TimesheetSlat__dayTotal")?.innerHTML;
        if (timeTrackingElement)
          timeTrackingElements.push(timeTrackingElement)
      }
    }
  })
  return timeTrackingElements
}

function queryElements(selector: string, callback: (element: Element) => void) {
  const elements = document.querySelectorAll(selector);
  elements.forEach(element => callback(element));
}

function observe(selector: string, callback: (element: Element) => void) {
  queryElements(selector, callback);

  const observer = new MutationObserver(() => {
    queryElements(selector, callback);
  });
  
  observer.observe(document.documentElement, {
    attributes: true,
    childList: true,
    characterData: true,
  });
}

const debounce = <F extends (...args: any[]) => any>(func: F, waitFor: number) => {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  const debounced = (...args: Parameters<F>) => {
    if (timeout !== null) {
      clearTimeout(timeout);
      timeout = null;
    }
    timeout = setTimeout(() => func(...args), waitFor);
  };

  return debounced as (...args: Parameters<F>) => ReturnType<F>;
};

const shouldShowWrongHoursWarn = (element: Element) => {
  // const textInElement = element.querySelectorAll('.TimeEntry')[1].innerText
  return Array.from(element.querySelectorAll('.TimeEntry')).filter((timeEntryEl: Element) => {
    // (^|-)(12|1|2|3|4|5):\d{2}\sAM|(^|-)(9|10|11|12]):\d{2}\sPM
    const timeEntryContent = timeEntryEl.textContent;
    const timeEntryContentMatch = timeEntryContent?.match(/(^|-)(12|1|2|3|4|5):\d{2}\sAM|(^|-)(9|10|11|12]):\d{2}\sPM/)
    // if (timeEntryContentMatch && timeEntryContentMatch.length>0){
    //   console.log("MATCH", timeEntryContent)
    // }
    return timeEntryContentMatch && timeEntryContentMatch.length>0
  }).length>0
}


const readWorkingHoursAndApplyChanges = (updateValueCallback: React.Dispatch<React.SetStateAction<number>>) => {
  chrome.storage.sync.get('workdayHours')
    .then(localStorageVal => {
      const workdayHours:number = (localStorageVal.workdayHours && parseInt(localStorageVal.workdayHours)) || WORKDAY_HOURS_DEFAULT;
      updateValueCallback(workdayHours);
    })
}

const verifyHours = (elements: NodeListOf<Element>) => {
  elements.forEach((el) => {
    const elementToModify = el.querySelector('.TimesheetSlat__dataWrapper');
    if (elementToModify){
      elementToModify.classList.remove('wrongHoursWarn');
      if (shouldShowWrongHoursWarn(el)){
        elementToModify.classList.add('wrongHoursWarn');
      }
    }
    
  })
}

function App() { 
  chrome.runtime.onMessage.addListener((request: PopupMessage, sender, sendResponse: ContentScriptResponse) => {
    // notifying the popup about the received message
    sendResponse({responseCode: 200}); 
    
    
    const { type } = request;

    switch (type){
      case 'HOURS_PER_DAY_UPDATED':
        console.log("HELLO UPDATE")
        readWorkingHoursAndApplyChanges(setWorkdayHours);
        break
      default:
        console.warn("Timeshifts Extension :: not captured message")
    }
  })
   

  const [workdayHours, setWorkdayHours] = useState<number>(8)
  const [timeTrackingElements, setTimeTrackingElements] = useState<string[]>([])
  
  const updateTimeTrackingElements = useCallback(async() => {
    const timeTrackingElements = await getTimeTrackingElements();
    setTimeTrackingElements(timeTrackingElements)
  }, [])

  const onElementsChange = useCallback(() => debounce(updateTimeTrackingElements, 1000)(),[updateTimeTrackingElements]);
  
  useEffect(() => {
    observe('.TimesheetEntries', () => {  
      onElementsChange();
    });
  },[onElementsChange])

  useEffect(() => {
    console.log("HELLO UPDATE DESPUES")
  },[workdayHours])
  
  const totalMonthWorkedHoursMs = timeTrackingElements
  .filter(timeTracking => timeTracking.replace(/[^0-9.]/g,"") !== "000")
  .reduce((acc, curr) => parse(acc.toString())+parse(curr), 0);

  // reading the workdayHours from user localStorage and updating the local state (or defining the default)
  readWorkingHoursAndApplyChanges(setWorkdayHours)  
    
  const totalMonthHoursToWorkInMs = parse(`${timeTrackingElements.length*workdayHours}h`);
  const humanTimeDifference = getHumanTime(totalMonthWorkedHoursMs-totalMonthHoursToWorkInMs, true);

  return (
    <>
      { timeTrackingElements.length === 0 && 
        <div className="content-wrapper">
          <div className="placeholder">
            <div className="animated-background" />
          </div>
        </div>
      }
      { timeTrackingElements.length > 0 && 
        <>
          <div className="TimesheetSummary__divider" />
          <div style={{backgroundColor: `${parse(humanTimeDifference, 'h') >= 0 ? 'rgba(0,255,0,0.1)' : 'rgba(255,0,0,0.1)'}`, padding: '1rem 0.5rem'}}>
            <div className="TimesheetSummary__title TimesheetSummary__title--payPeriod">Monthly Hours Balance</div>
            <div className="TimesheetSummary__text">{`Worked / Should Have Worked: ${getHumanTime(totalMonthWorkedHoursMs, false)} / ${getHumanTime(totalMonthHoursToWorkInMs, false)} `}</div>
            <div className="TimesheetSummary__payPeriodTotal">
              <span className="TimesheetSummary__payPeriodClockIcon">
                <svg aria-hidden="true" focusable="false" pointer-events="none" width="20" height="20" className="css-0">
                  <use xlinkHref="#fab-clock-20x20"></use>
                </svg>
              </span>
              {humanTimeDifference}
            </div>
          </div>
        </>
      }
    </>
  );
}

export default App;