import React, {useState, useEffect} from 'react'
import './popup.css';
import Slider from '@mui/material/Slider';
import { Checkbox, FormControlLabel } from '@mui/material';

const WORKING_HOURS_MIN = '1';
const WORKING_HOURS_MAX = '8';
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

    const [workdayHours, setWorkdayHours] = useState<string>(WORKDAY_HOURS_DEFAULT);
    const [workingBreedDay, setWorkingBreedDay] = useState<boolean>(false);

    useEffect(() => {
        console.log("HELLO", messageResponseCode)
        messageResponseCode
        debugger;
    },[messageResponseCode])
    const onWorkingBreedDayChangeHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
        const checked = e.target.checked;
        chrome.storage.sync.set({ workingBreedDay: e.target.checked })
        setWorkingBreedDay(checked);
        sendMessageToContentScript('WORKING_BREED_DAY', checked, setMessageResponseCode)
    }

    const onUpdateWorkdayHours = async () => {
        if (workdayHours.match(/\d{1}/)){
            sendMessageToContentScript('HOURS_PER_DAY_UPDATED', workdayHours, setMessageResponseCode)
            chrome.storage.sync.set({ workdayHours: workdayHours });

        } else {
            console.error("non-valid input from slider")
        }
    }

    useEffect(() => {
        chrome.storage.sync.get('workdayHours').then(result => result['workdayHours'] && setWorkdayHours(result['workdayHours']));
        chrome.storage.sync.get('workingBreedDay').then(result => typeof result['workingBreedDay'] !== undefined && setWorkingBreedDay(Boolean(result['workingBreedDay'])));
    },[])

    return (
        <div id="timetracking-popup">
            <div>
                <div className='settings-entry'>
                    <div style={{display: 'flex', justifyContent: 'space-between', padding: '0 0.3rem'}}>
                        <div>Working Hours</div>
                        <div>{workdayHours}</div>
                    </div>

                    <Slider
                        size="small"
                        value={parseInt(workdayHours)}
                        min={parseInt(WORKING_HOURS_MIN)}
                        step={1}
                        max={parseInt(WORKING_HOURS_MAX)}
                        onChange={(e) => setWorkdayHours((e.target as HTMLInputElement).value.toString())}
                        onBlur={onUpdateWorkdayHours}
                        aria-labelledby="non-linear-slider"
                        sx={{ color: '#dfa90d'}}
                    />

                    {messageResponseCode && messageResponseCode === 200 && <div>Message Successful</div>}
                </div>

                <div className='settings-entry'>
                    <FormControlLabel
                        label="Working on October's 12th?"
                        sx={{ marginLeft: "0.3rem", '& .MuiFormControlLabel-label': { fontSize: '12px' } }}
                        labelPlacement='start'
                        control={
                        <Checkbox
                            size="small"
                            checked={workingBreedDay}
                            onChange={onWorkingBreedDayChangeHandler}
                            sx={{
                                color: "#bfd05f",
                                '&.Mui-checked': {
                                    color: "#dfa90d",
                                },
                            }}
                        />}
                    />
                </div>
            </div>
        </div>
    )
}

export default Popup;