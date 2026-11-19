// Synthetic audit shaped like dw --json audit. Invented student, no real data.
const cls = (d, n, title, credits, term, extra = {}) => ({
  id: `${d}${n}${term}`, discipline: d, number: n, courseTitle: title, credits: String(credits),
  termLiteral: term, inProgress: 'N', passed: 'Y', letterGrade: 'A', gpaGradePoints: '12', ...extra,
});

export const audit = {
  auditHeader: {
    residentApplied: '90', transferApplied: '20', percentComplete: '92',
    studentName: 'Test, Student', studentId: '000000000', studentEmail: 'x@example.edu', degreeworksGpa: '3.9',
  },
  degreeInformation: {
    degreeDataArray: [{ degreeLiteral: 'Bachelor of Science in IT', catalogYearLit: '2023', studentLevelLiteral: 'Senior', activeTermLiteral: 'Fall 2026' }],
    goalArray: [{ code: 'CONC', valueLiteral: 'Cyber Operations Security' }, { code: 'MAJOR', valueLiteral: 'BSIT-Information Technology' }],
  },
  classInformation: {
    classArray: [
      cls('IT', '3203', 'Intro to Web', 3, 'Fall 2025'),
      cls('IT', '3423', 'Ops Security', 3, 'Spring 2026'),
      cls('IT', '4323', 'Data Comm', 3, 'Spring 2026'),
      cls('IT', '4823', 'Information Sec. Admin', 3, 'Fall 2026', { inProgress: 'Y', letterGrade: 'REGD' }),
      cls('IT', '4983', 'IT Capstone Project', 3, 'Fall 2026', { inProgress: 'Y', letterGrade: 'REGD' }),
    ],
  },
  inProgress: { classArray: [{ id: 'IT4823Fall 2026' }, { id: 'IT4983Fall 2026' }] },
  blockArray: [
    { requirementType: 'DEGREE', title: 'Degree: BS IT', percentComplete: '92', ruleArray: [
      { ruleType: 'Block', label: 'Major Requirements', percentComplete: '92' },
    ] },
    { requirementType: 'MAJOR', title: 'Major in IT', percentComplete: '92', ruleArray: [
      { ruleType: 'Subset', label: 'MAJOR REQUIREMENTS', percentComplete: '92', ruleArray: [
        { ruleType: 'Course', ruleId: 'r-cap', label: 'IT Capstone', percentComplete: '98', inProgressIncomplete: 'Yes',
          creditsApplied: '3', requirement: { creditsBegin: '3', courseArray: [{ discipline: 'IT', number: '4983' }] },
          classesAppliedToRule: { classArray: [{ discipline: 'IT', number: '4983' }] } },
        { ruleType: 'Course', ruleId: 'r-elec', label: 'Elective Courses - 3 Credits', percentComplete: '0',
          creditsApplied: '0', requirement: { creditsBegin: '3', courseArray: [
            { discipline: 'IT', number: '4833' }, { discipline: 'IT', number: '4893' }, { discipline: '@', number: '@' }] } },
      ] },
    ] },
  ],
};

const prereq = (subj, num, connector = '', concurrent = 'N', l = '', r = '') => ({
  subjectCodePrerequisite: subj, courseNumberPrerequisite: num, connector, concurrencyIndicator: concurrent,
  leftParenthesis: l, rightParenthesis: r,
});
const section = (term, seats) => ({ termLiteral: term, seatsAvailable: String(seats) });

export const courseRaw = {
  'IT 4983': { courseInformation: { courses: [{ title: 'IT Capstone Project', creditHourLow: '3',
    prerequisites: [prereq('IT', '3423'), prereq('IT', '4323', 'A', 'Y'), prereq('IT', '4823', 'A', 'Y')],
    sections: [section('Spring 2027', 4), section('Spring 2027', 6)] }] } },
  'IT 4823': { courseInformation: { courses: [{ title: 'Information Sec. Admin', creditHourLow: '3',
    prerequisites: [prereq('', '', '', 'N', '('), prereq('CSE', '2300', 'O'), prereq('MATH', '2345', 'O', 'N', '', ')')],
    sections: [section('Spring 2027', 10), section('Summer 2027', 5)] }] } },
  'IT 4833': { courseInformation: { courses: [{ title: 'Wireless Security', creditHourLow: '3',
    prerequisites: [prereq('', '', 'O', 'N', '('), prereq('IT', '4323', '', 'N', '('), prereq('ECET', '3400', 'O', 'N', '', ')'), prereq('', '', '', 'N', '', ')')],
    sections: [section('Spring 2027', 2)] }] } },
  'IT 4893': { courseInformation: { courses: [{ title: 'Pen Testing', creditHourLow: '3', prerequisites: [], sections: [] }] } },
};
