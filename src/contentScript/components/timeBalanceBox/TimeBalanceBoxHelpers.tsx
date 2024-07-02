import parse from 'parse-duration'

/**
 * Function that clean up the dayEntries that are empty (0:00)
 * @param dayEntries 
 * @returns 
 */
export const removeEmptyDayEntries = (dayEntries: Array<string>) => dayEntries
.filter(dayEntry => dayEntry.replace(/[^0-9.]/g,"") !== "000");

/**
 * Function that returns the abbreviation of the month the user is reviewing
 * @returns 
 */
export const getMonthInReviewAbbrev = () => document.body.querySelectorAll('.TimesheetSecondHeader h4')[0].innerHTML.replace(/^(.+)\s.+$/,"$1");

/**
 * Function that returns the week day abbreviattion of the given day entry
 * @param dayEntryElement 
 * @returns 
 */
export const getDayNameAbbrev = (dayEntryElement: Element) => dayEntryElement.querySelector(".TimesheetSlat__dayOfWeek")?.innerHTML || "";

/**
 * Function that returns a boolean to determine if the given day is part of the weekend or not
 * @param dayOfWeekNameAbbrev 
 * @returns 
 */
export const isWeekend = (dayEntryElement: Element) => ["Sat", "Sun"].includes(getDayNameAbbrev(dayEntryElement));

/**
 * Function that returns a boolean to determine if the given day is a full day holiday for the user or not
 * @param dayEntryElement 
 * @returns 
 */
export const isFullDayPaidLeave = (dayEntryElement: Element) => {
  const paidLeaveInformation = dayEntryElement.querySelector(".TimesheetSlat__extraInfoItem")?.textContent;
  const paidLeaveInformationHasNumbers =  paidLeaveInformation?.match(/\d/)
  const paidLeaveInformationNumber = paidLeaveInformationHasNumbers && paidLeaveInformation?.replace(/.*(\d).+/, "$1");
  // Sometimes it says "1 holidays day"; sometimes, if you take a holidays that is already a bank holidays, it says "0 holidays day" just above of the bank holidays day
  return paidLeaveInformation && (!paidLeaveInformationNumber || (paidLeaveInformationNumber && ["0", "1"].includes(paidLeaveInformationNumber)))
}

/**
 * Function that returns a boolean to determine if the given day is a full day holiday for the user or not
 * @param dayEntryElement 
 * @returns 
 */
export const isPartialHolidays = (dayEntryElement: Element) => {
  const paidLeaveInformation = dayEntryElement.querySelector(".TimesheetSlat__extraInfoItem")?.textContent;
  const paidLeaveInformationHasNumbers =  paidLeaveInformation?.match(/\d/)
  return paidLeaveInformationHasNumbers && paidLeaveInformation?.match(/.*(\d{1}\.\d{1,2}).+/)
}

/**
 * Function that returns a boolean if the user is working the breed day in Spain (October the 12th)
 * @param dayOfMonthNumber 
 * @param monthAbbrev 
 * @returns 
 */
export const isBreedDay = (dayEntryElement: Element) => getDayOfTheMonthNumber(dayEntryElement) === 12 && getMonthInReviewAbbrev() === 'Oct';

/**
 * Function that returns the day number of the given day entry
 * @param dayEntryElement 
 * @returns 
 */
export const getDayOfTheMonthNumber = (dayEntryElement: Element) => parseInt((dayEntryElement?.querySelector(".TimesheetSlat__dayDate")?.innerHTML || "").replace(/[^0-9.]/g,"")) || null;

/**
 * Function that returns true if the user is reviewing the current payroll month (not historical data)
 * @returns 
 */
export const isReviewingCurrentPayPeriod = () => document.body.querySelectorAll(".TimesheetHeader__period .fab-SelectToggle__content")[0].innerHTML === 'This Pay Period'

/**
 * Function that returns the text for the given day entry
 * @param dayEntryElement 
 * @returns 
 */
export const getDayEntryElementText = (dayEntryElement: Element) => dayEntryElement.querySelector(".TimesheetSlat__dayTotal")?.innerHTML || "";

/**
 * This function returns true if the day entry test is empty (0h 00m)
 * @param dayEntryElementText 
 * @returns 
 */
export const isDayEntryEmpty = (dayEntryElementText: string) => dayEntryElementText.replace(/[^0-9.]/g,"") === "000"

/**
 * This function decides if the given day needs to be taken into consideration
 * @param dayEntryElement 
 * @returns 
 */
const needDayToBeIncluded = (dayEntryElement: Element) => {
  const todayDayNumber = new Date().getDate();
  const reviewingCurrentPayPeriod = isReviewingCurrentPayPeriod();
  const dayOfTheMonthNumber = getDayOfTheMonthNumber(dayEntryElement);
  if (todayDayNumber){
    // if the user is checking another month all days need to be taken into account
    if (!reviewingCurrentPayPeriod) return true

    // when the user is reviewing current month only the days before today are taken into account
    return dayOfTheMonthNumber && dayOfTheMonthNumber <= todayDayNumber
  }
}

const needDayToBeExcluded = (dayEntryElement: Element, workingBreedDay: boolean) => {
  return isWeekend(dayEntryElement) || (isBreedDay(dayEntryElement) && !workingBreedDay) || isFullDayPaidLeave(dayEntryElement) 
}

/**
 * This function gets all the dayEntriesElements and filters the ones that doesn't need to be included (holidays, etc..)
 * @param dayEntriesElements 
 * @param workingBreedDay 
 * @returns 
 */
export const getDayEntriesToConsider = (dayEntriesElements: NodeListOf<Element>, workingBreedDay: boolean) => {

  return Array.from(dayEntriesElements).filter(dayEntryElement => needDayToBeIncluded(dayEntryElement) && !needDayToBeExcluded(dayEntryElement, workingBreedDay));
  
}

/**
 * This function will recieve the element with a dayEntryElement and the hours the user work every day. Then will extract the percentage of that day that the user has holidays in hours and then return that amount in ms to be able to remove it from the total hourse the user need to work
 * @param dayEntryElement 
 * @param workdayHours 
 * @returns 
 */
const getMsToDiscountFromPartialHolidays = (dayEntryElement: Element, workdayHours: number) => {
  // this should be something like 0,15 - 0,60
  const dayHolidayPercentageString = dayEntryElement?.querySelector(".TimesheetSlat__extraInfoItem")?.textContent?.replace(/.*(\d{1}\.\d{1,2}).+/, "$1");
  if (dayHolidayPercentageString){
    // this is the value converted to float and then to percentage
    const dayHolidayPercentage = parseFloat(dayHolidayPercentageString)*100;
    // then we get the amount of hours that the previous value mean depending on the hours you work every day
    const hoursToWork = dayHolidayPercentage*workdayHours/100;
    return parse(`${hoursToWork}h`)  
  }
  return 0;
}

/**
 * Function that return the sum of all valid dayEntries in ms
 * @param dayEntries 
 * @returns 
 */
export const getTotalMonthWorkedHoursMs = (dayEntries: Array<Element>) => {
  const dayEntriesText = dayEntries.map(dayEntry => getDayEntryElementText(dayEntry))
  return removeEmptyDayEntries(dayEntriesText).reduce((acc, curr) => parse(acc.toString())+parse(curr), 0)
};

/**
 * Function that return the sum of all hours that the user should work on the month in ms
 * @param dayEntriesElements 
 * @param workdayHours
 * @returns 
 */
export const getTotalMonthHoursToWorkInMs = (dayEntriesElements: Array<Element>, workdayHours: number) => {
  const totalMonthHoursNumber = dayEntriesElements.length*workdayHours;
  if (dayEntriesElements.some(dayEntryElement => isPartialHolidays(dayEntryElement))){
    const timeToRemoveBecauseOfPartialHolidaysInMs = dayEntriesElements.reduce((acc, dayEntryElement) => {
      if (isPartialHolidays(dayEntryElement)){
        return acc + getMsToDiscountFromPartialHolidays(dayEntryElement, workdayHours)
      }
      return acc;
    }, 0)
    return parse(`${totalMonthHoursNumber}h`)-timeToRemoveBecauseOfPartialHolidaysInMs;
  }
  return parse(`${totalMonthHoursNumber}h`);
}

/**
 * Function that converts a time in ms to a "human time" (00 H 00 min). It could be positive or negative
 * @param msTime 
 * @param includeBalanceSign 
 * @returns 
 */
export const getHumanTime = (msTime: number, includeBalanceSign: boolean) => {
  const parsedTime = Math.round(parse(msTime.toString(),'m'));
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