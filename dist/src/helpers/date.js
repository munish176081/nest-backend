"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateAgeInMonths = exports.calculateAgeInYears = exports.calculateAge = exports.daysToMilliseconds = void 0;
const daysToMilliseconds = (days) => {
    return days * 24 * 60 * 60 * 1000;
};
exports.daysToMilliseconds = daysToMilliseconds;
const calculateAge = (dateOfBirth) => {
    if (!dateOfBirth)
        return '';
    const birthDate = new Date(dateOfBirth);
    const today = new Date();
    if (isNaN(birthDate.getTime()))
        return '';
    if (birthDate > today) {
        console.log('Future date detected:', dateOfBirth, 'returning "Not born yet"');
        return 'Not born yet';
    }
    let years = today.getFullYear() - birthDate.getFullYear();
    let months = today.getMonth() - birthDate.getMonth();
    let days = today.getDate() - birthDate.getDate();
    if (days < 0) {
        months--;
        const lastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
        days += lastMonth.getDate();
    }
    if (months < 0) {
        years--;
        months += 12;
    }
    if (years > 0) {
        if (months > 0) {
            return `${years} year${years > 1 ? 's' : ''} ${months} month${months > 1 ? 's' : ''}`;
        }
        return `${years} year${years > 1 ? 's' : ''}`;
    }
    else if (months > 0) {
        if (days > 0) {
            return `${months} month${months > 1 ? 's' : ''} ${days} day${days > 1 ? 's' : ''}`;
        }
        return `${months} month${months > 1 ? 's' : ''}`;
    }
    else if (days > 0) {
        return `${days} day${days > 1 ? 's' : ''}`;
    }
    else {
        return 'Less than 1 day';
    }
};
exports.calculateAge = calculateAge;
const calculateAgeInYears = (dateOfBirth) => {
    if (!dateOfBirth)
        return 0;
    const birthDate = new Date(dateOfBirth);
    const today = new Date();
    if (isNaN(birthDate.getTime()))
        return 0;
    let years = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        years--;
    }
    return Math.max(0, years);
};
exports.calculateAgeInYears = calculateAgeInYears;
const calculateAgeInMonths = (dateOfBirth) => {
    if (!dateOfBirth)
        return 0;
    const birthDate = new Date(dateOfBirth);
    const today = new Date();
    if (isNaN(birthDate.getTime()))
        return 0;
    const yearDiff = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    const dayDiff = today.getDate() - birthDate.getDate();
    let months = yearDiff * 12 + monthDiff;
    if (dayDiff < 0) {
        months--;
    }
    return Math.max(0, months);
};
exports.calculateAgeInMonths = calculateAgeInMonths;
//# sourceMappingURL=date.js.map