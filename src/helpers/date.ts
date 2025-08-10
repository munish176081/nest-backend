export const daysToMilliseconds = (days: number) => {
  return days * 24 * 60 * 60 * 1000;
};

/**
 * Calculate age from date of birth
 * @param dateOfBirth - Date of birth string or Date object
 * @returns Age in years, months, and days as a formatted string
 */
export const calculateAge = (dateOfBirth: string | Date): string => {
  if (!dateOfBirth) return '';
  
  const birthDate = new Date(dateOfBirth);
  const today = new Date();
  
  if (isNaN(birthDate.getTime())) return '';
  
  // Check if date is in the future
  if (birthDate > today) {
    console.log('Future date detected:', dateOfBirth, 'returning "Not born yet"');
    return 'Not born yet';
  }
  
  let years = today.getFullYear() - birthDate.getFullYear();
  let months = today.getMonth() - birthDate.getMonth();
  let days = today.getDate() - birthDate.getDate();
  
  // Adjust for negative months/days
  if (days < 0) {
    months--;
    const lastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
    days += lastMonth.getDate();
  }
  
  if (months < 0) {
    years--;
    months += 12;
  }
  
  // Format the age
  if (years > 0) {
    if (months > 0) {
      return `${years} year${years > 1 ? 's' : ''} ${months} month${months > 1 ? 's' : ''}`;
    }
    return `${years} year${years > 1 ? 's' : ''}`;
  } else if (months > 0) {
    if (days > 0) {
      return `${months} month${months > 1 ? 's' : ''} ${days} day${days > 1 ? 's' : ''}`;
    }
    return `${months} month${months > 1 ? 's' : ''}`;
  } else if (days > 0) {
    return `${days} day${days > 1 ? 's' : ''}`;
  } else {
    return 'Less than 1 day';
  }
};

/**
 * Calculate age in years only
 * @param dateOfBirth - Date of birth string or Date object
 * @returns Age in years as a number
 */
export const calculateAgeInYears = (dateOfBirth: string | Date): number => {
  if (!dateOfBirth) return 0;
  
  const birthDate = new Date(dateOfBirth);
  const today = new Date();
  
  if (isNaN(birthDate.getTime())) return 0;
  
  let years = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    years--;
  }
  
  return Math.max(0, years);
};

/**
 * Calculate age in months only
 * @param dateOfBirth - Date of birth string or Date object
 * @returns Age in months as a number
 */
export const calculateAgeInMonths = (dateOfBirth: string | Date): number => {
  if (!dateOfBirth) return 0;
  
  const birthDate = new Date(dateOfBirth);
  const today = new Date();
  
  if (isNaN(birthDate.getTime())) return 0;
  
  const yearDiff = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  const dayDiff = today.getDate() - birthDate.getDate();
  
  let months = yearDiff * 12 + monthDiff;
  
  if (dayDiff < 0) {
    months--;
  }
  
  return Math.max(0, months);
};
