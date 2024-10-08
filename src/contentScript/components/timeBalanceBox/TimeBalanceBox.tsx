import parse from 'parse-duration'
import { useState } from "react";
import { getDayEntriesToConsider, getHumanTime, getTotalMonthHoursToWorkInMs, getTotalMonthWorkedHoursMs } from "./TimeBalanceBoxHelpers";

declare global {
  var initialized: boolean;
}

type CallbackType = 'HOURS_PER_DAY_UPDATED' | 'WORKING_BREED_DAY';
type UpdateStateTypes = number | boolean;

type PopupMessage = {
  type: CallbackType;
  value: UpdateStateTypes
}

type CustomResponse = {responseCode: number};

type ContentScriptResponse = {
  (response: CustomResponse): void;
}

type ResponseCallbacks = {
  [key in CallbackType]: React.Dispatch<React.SetStateAction<UpdateStateTypes>>
}

const WORKDAY_HOURS_DEFAULT = 8;

const getWorkdayHoursFromLocalStorage = async (): Promise<number> => {
  return chrome.storage.sync.get('workdayHours')
    .then(localStorageVal => (localStorageVal.workdayHours && parseInt(localStorageVal.workdayHours)) || WORKDAY_HOURS_DEFAULT
    );
}

const getWorkingBreedDayFromLocalStorage = async (): Promise<boolean> => {
  return chrome.storage.sync.get('workingBreedDay').then((localStorageVal) => Boolean(localStorageVal.workingBreedDay))
}

const installWorkdayHoursListener = async (onResponseCallbacks: ResponseCallbacks) => {
  // initially we execute the following lines to get the latest values from the localStorage
  getWorkdayHoursFromLocalStorage().then((workdayHours) => onResponseCallbacks['HOURS_PER_DAY_UPDATED'](workdayHours));
  getWorkingBreedDayFromLocalStorage().then((workingBreedDay) => onResponseCallbacks['WORKING_BREED_DAY'](workingBreedDay));
  
  if (!window.initialized) {
    window.initialized = true;
    chrome.runtime.onMessage.addListener((request: PopupMessage, sender, sendResponse: ContentScriptResponse) => {
      const { type, value } = request;
      // updating the value in the state
      onResponseCallbacks[type](value)
      
      let localStorageKey;
      switch (type){
        case 'HOURS_PER_DAY_UPDATED':
          localStorageKey = 'workdayHours';
          break
          case 'WORKING_BREED_DAY':
            localStorageKey = 'workingBreedDay';
            break
            default:
              console.warn("Timetrack-Extension :: not captured message")
            }
            
      // we update the local storage for the next time the user visits the page
      if (localStorageKey)
        chrome.storage.sync.  set({ [localStorageKey]: value });
      
      // notifying the popup about the received message      
      sendResponse({responseCode: 200}); 
    })
  }
}


const TimeBalanceBox = ({dayEntriesElements}: {dayEntriesElements: NodeListOf<Element>}) => {
  const [workdayHours, setWorkdayHours] = useState<UpdateStateTypes>(WORKDAY_HOURS_DEFAULT)
  const [workingBreedDay, setWorkingBreedDay] = useState<UpdateStateTypes>(false)
  
  // initializing the listener + getting the workdayHours from the localStorage
  installWorkdayHoursListener({'HOURS_PER_DAY_UPDATED': setWorkdayHours, 'WORKING_BREED_DAY': setWorkingBreedDay})
  
  const dayEntriesToConsider = getDayEntriesToConsider(dayEntriesElements, workingBreedDay as boolean);
  const totalMonthWorkedHoursMs = getTotalMonthWorkedHoursMs(dayEntriesToConsider);
  const totalMonthHoursToWorkInMs = getTotalMonthHoursToWorkInMs(dayEntriesToConsider, workdayHours as number);
  const timeBalanceHumanTime = getHumanTime(totalMonthWorkedHoursMs-totalMonthHoursToWorkInMs, true);
  
  return ( 
    <>
      { dayEntriesElements.length === 0 && 
        <div className="content-wrapper">
          <div className="placeholder">
            <div className="animated-background" />
          </div>
        </div>
      }
      { dayEntriesElements.length > 0 && 
        <>
          <div className="TimesheetSummary__divider" />
          <div style={{backgroundColor: `${parse(timeBalanceHumanTime, 'h') >= 0 ? 'rgba(0,255,0,0.1)' : 'rgba(255,0,0,0.1)'}`, padding: '1rem 0.5rem'}}>
            <div className="TimesheetSummary__title TimesheetSummary__title--payPeriod">Monthly Hours Balance</div>
            <div className="TimesheetSummary__text">{`Worked / Should Have Worked: ${getHumanTime(totalMonthWorkedHoursMs, false)} / ${getHumanTime(totalMonthHoursToWorkInMs, false)} `}</div>
            <div className="TimesheetSummary__payPeriodTotal">
              <span className="TimesheetSummary__payPeriodClockIcon">
                <svg aria-hidden="true" focusable="false" pointer-events="none" width="20" height="20" className="css-0">
                  <use xlinkHref="#fab-clock-20x20"></use>
                </svg>
              </span>
              {timeBalanceHumanTime}
            </div>
          </div>
        </>
      }
    </>
  )

};

export default TimeBalanceBox;