
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
 * Function that returns a boolean  to determine if the given day is holidays for the user or not
 * @param dayEntryElement 
 * @returns 
 */
export const isPaidLeave = (dayEntryElement: Element) => Boolean(dayEntryElement.querySelector(".TimesheetSlat__extraInfoItem"))

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
export const getDayEntryElementText = (dayEntryElement: Element) => dayEntryElement.querySelector(".TimesheetSlat__dayTotal")?.innerHTML;

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

const needDayToBeExcluded = (dayEntryElement: Element) => {
  return isWeekend(dayEntryElement) || (isBreedDay /**&& !workingOnBreedDay */) || isPaidLeave(dayEntryElement) 
}


export const getDayEntriesToConsiderText = (dayEntriesElements: NodeListOf<Element>, workingBreedDay: boolean) => {

  const dayEntriesToConsiderText: string[] = []
  
  dayEntriesElements.forEach(dayEntryElement => {
    if (needDayToBeIncluded(dayEntryElement) && !needDayToBeExcluded(dayEntryElement)){
      const dayEntryElementText = getDayEntryElementText(dayEntryElement);
      if (dayEntryElementText)
        dayEntriesToConsiderText.push(dayEntryElementText)
    }
  })

  return dayEntriesToConsiderText;
}