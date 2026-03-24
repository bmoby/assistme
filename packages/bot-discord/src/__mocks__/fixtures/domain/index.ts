export { createStudent, resetSeq as resetStudentSeq } from './student.js';
export { createSession, resetSeq as resetSessionSeq } from './session.js';
export { createExercise, resetSeq as resetExerciseSeq } from './exercise.js';
export { createFaqEntry, resetSeq as resetFaqEntrySeq } from './faq-entry.js';

import { resetSeq as resetStudentSeq } from './student.js';
import { resetSeq as resetSessionSeq } from './session.js';
import { resetSeq as resetExerciseSeq } from './exercise.js';
import { resetSeq as resetFaqEntrySeq } from './faq-entry.js';

export function resetAllFixtureSeqs(): void {
  resetStudentSeq();
  resetSessionSeq();
  resetExerciseSeq();
  resetFaqEntrySeq();
}
