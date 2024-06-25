import React, {useState, useEffect} from 'react'
import './popup.css';

const WORKING_HOURS_OPTIONS = ['4', '6', '8'];
const WORKDAY_HOURS_DEFAULT = '8';

type MessageType = "HOURS_PER_DAY_UPDATED" | "WORKING_BREED_DAY";
type ValueType = string | boolean;
type UpdateStateTypes = number | undefined;
type ResponseCallback =  React.Dispatch<React.SetStateAction<UpdateStateTypes>>

type CustomResponse = {responseCode: number};

const sendMessageToContentScript = async (messageType: MessageType, value: ValueType, responseCallback: ResponseCallback) => {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    console.log(tab)
    if (tab && tab.id){
        const response = await chrome.tabs.sendMessage(tab.id, {type: messageType, value}) as CustomResponse;
        if (response?.responseCode) responseCallback(response?.responseCode)

        setTimeout(() => {
            responseCallback(undefined);
        }, 5000)
    }
} 

function Popup() {
    const [messageResponseCode, setMessageResponseCode] = useState<number>();
    
    const [invalidInputError, setInvalidInputError] = useState<string>();

    const [workdayHours, setWorkdayHours] = useState<string>(WORKDAY_HOURS_DEFAULT);
    const [workingBreedDay, setWorkingBreedDay] = useState<boolean>(false);

    const onChangedHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
        const checked = e.target.checked;
        chrome.storage.sync.set({ workingBreedDay: e.target.checked })
        setWorkingBreedDay(checked);
        sendMessageToContentScript('WORKING_BREED_DAY', checked, setMessageResponseCode)
    }

    const onUpdateWorkdayHours = async () => {
        if (workdayHours.match(/\d{1}/)){
            sendMessageToContentScript('HOURS_PER_DAY_UPDATED', workdayHours, setMessageResponseCode)
            chrome.storage.sync.set({ workdayHours: workdayHours });
            setInvalidInputError(undefined)

        } else {
            setInvalidInputError('The amount of hours you work per day must be a number from 1 to 9')
        }
    }

    useEffect(() => {
        chrome.storage.sync.get('workdayHours').then(result => setWorkdayHours(result['workdayHours']));
        chrome.storage.sync.get('workingBreedDay').then(result => setWorkingBreedDay(Boolean(result['workingBreedDay'])));
    },[])

    return (
        <div id="timetracking-popup">
            <div>
                <h3 id="title">Settings</h3>
                <div className='settings-entry'>
                    <label htmlFor="workdayHours">Working Hours</label>

                    <div className='working-hours-setting'>
                       {
                            WORKING_HOURS_OPTIONS.map((workingHourOption, i) => {
                                return <button key={i} onClick={(e) => setWorkdayHours(workingHourOption)}>{workingHourOption}</button>
                            })
                       } 
                    </div>
                    <div className='working-hours-setting'>
                        <input
                        type='text'
                        id='workdayHours'
                        value={workdayHours}
                        onChange={(e) => setWorkdayHours(e.target.value)}
                        />
                        <button onClick={onUpdateWorkdayHours} >
                            <span>Save</span>
                        </button>
                    </div>
                    {messageResponseCode && messageResponseCode === 200 && <div>Message Successful</div>}
                    {invalidInputError && <div>{invalidInputError}</div>}
                </div>
                
                <div className='settings-entry'>
                    <input
                        type="checkbox"
                        id="workingBreedDay"
                        onChange={onChangedHandler}
                        checked={workingBreedDay}
                    />
                    <label htmlFor="workingBreedDay">
                        Working on October's 12th?
                    </label>                  
                </div>
            </div>
        </div>
    )
}

export default Popup;