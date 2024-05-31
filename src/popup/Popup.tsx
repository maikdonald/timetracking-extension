import React, {useState, useEffect} from 'react'

function Popup() {
    const [messageResponseCode, setMessageResponseCode] = useState<number>();
    const [workdayHours, setWorkdayHours] = useState<string>('');
    const [workingOct12, setWorkingOct12] = useState<boolean>(false);

    const onChangedHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
        const checked = e.target.checked;
        chrome.storage.sync.set({ workingOct12: e.target.checked })
        setWorkingOct12(checked);
    }

    const onUpdateWorkdayHours = async () => {
        const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
        console.log(tab)
        if (tab && tab.id){
            const response = await chrome.tabs.sendMessage(tab.id, {type: "HOURS_PER_DAY_UPDATED"});
            if (response?.responseCode) setMessageResponseCode(response?.responseCode)

            setTimeout(() => {
                setMessageResponseCode(undefined);
            }, 5000)
        }
        
        chrome.storage.sync.set({ workdayHours: workdayHours });
    }

    useEffect(() => {
        chrome.storage.sync.get('workdayHours', (result) => setWorkdayHours(result['workdayHours']));
        chrome.storage.sync.get('workingOct12', (result) => setWorkingOct12(Boolean(result['workingOct12'])));
    },[])

    return (
        <div className='w-72'>
            <div className='p-4'>
                <h1 className='text-base mb-4 font-medium'>Lemonade BambooHR Timeshifts</h1>

                <div className='mb-10'>
                    <label htmlFor="workdayHours">How many hours do you work a day?</label>
                    <input
                        type='text'
                        id='workdayHours'
                        value={workdayHours}
                        onChange={e => setWorkdayHours(e.target.value)}
                        className="bg-gray-50 border border-gray-200 w-full rounded-lg px-4 py-2 text-black focus:outline-none mb-5" />

                    <div className='flex items-center justify-end'>
                        <button onClick={onUpdateWorkdayHours} className="bg-green-500 hover:bg-green-400 transition duration-300 px-6 py-2 rounded-md text-white text-center">
                            <span>Save</span>
                        </button>
                    </div>
                    {messageResponseCode && messageResponseCode === 200 && <div>Message Successful</div>}
                </div>
                
                <div className="form-check">
                    <input
                        className="form-check-input"
                        type="checkbox"
                        id="workingOct12"
                        onChange={onChangedHandler}
                        checked={workingOct12}
                    />
                    <label className="form-check-label" htmlFor="workingOct12">
                        Working on October's 12th?
                    </label>                  
                </div>
            </div>
        </div>
    )
}

export default Popup;