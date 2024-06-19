import { useState } from "react";

type CallbackType = 'HOURS_PER_DAY_UPDATED' | 'WORKING_BREED_DAY';
type UpdateStateTypes = number | boolean;

type PopupMessage = {
  type: string;
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
  
  chrome.runtime.onMessage.addListener((request: PopupMessage, sender, sendResponse: ContentScriptResponse) => {
    // notifying the popup about the received message
    sendResponse({responseCode: 200}); 
    
    
    const { type } = request;
    
    switch (type){
      case 'HOURS_PER_DAY_UPDATED':
        // when we get this message we update the workdayHours value in the app that we have in the localStorage
        getWorkdayHoursFromLocalStorage().then((workdayHours) => onResponseCallbacks[type](workdayHours));
        break
      case 'WORKING_BREED_DAY':
        // when we get this message we update the workingBreedDay value in the app that we have in the localStorage
        getWorkingBreedDayFromLocalStorage().then((workingBreedDay) => onResponseCallbacks[type](workingBreedDay))
        break
      default:
        console.warn("Timetrack-Extension :: not captured message")
    }
  })
}



const TimeBalanceBox: {timeTrackEntries: NodeListOf<Element>} = ({timeTrackEntries}) => {
  const [workdayHours, setWorkdayHours] = useState<UpdateStateTypes>(WORKDAY_HOURS_DEFAULT)
  const [workingBreedDay, setWorkingBreedDay] = useState<UpdateStateTypes>(false)
  
  // initializing the listener + getting the workdayHours from the localStorage
  installWorkdayHoursListener({'HOURS_PER_DAY_UPDATED': setWorkdayHours, 'WORKING_BREED_DAY': setWorkingBreedDay})
  

};

export default TimeBalanceBox;