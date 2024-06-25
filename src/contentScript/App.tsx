import { useState, useEffect, useCallback } from 'react';
import TimeBalanceBox from './components/timeBalanceBox/TimeBalanceBox';

const getDayEntriesElements = () => document.body.querySelectorAll(".TimesheetSlat--clock:not(.TimesheetSlat--disabled)");

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
  const [dayEntriesElements, setDayEntriesElements] = useState<NodeListOf<Element>>(getDayEntriesElements())


  const updateDayEntriesElements = useCallback(async() => {
    setDayEntriesElements(await getDayEntriesElements())
  }, [])

  const onElementsChange = useCallback(() => debounce(updateDayEntriesElements, 1000)(),[updateDayEntriesElements]);
  
  useEffect(() => {
    observe('.TimesheetEntries', () => {  
      onElementsChange();
    });
  },[onElementsChange])

  return (
    <>
      {
        window.location.pathname.includes("timesheet") &&
          <TimeBalanceBox dayEntriesElements={dayEntriesElements} />
      }
    </>
  );
}

export default App;