// Finds which recorded allergy a medicine name matches, or null.
//
// Every word of the allergy must be in the medicine's name, ignoring capital letters and doses:
// "Amoxicillin 500mg" matches the allergy "amoxicillin", and "Ibuprofen" matches "IBUPROFEN 200mg",
// but "Vitamin D3" does not match "Vitamin C" (the "c" is missing). False alarms teach people to ignore warnings.
// It only knows names: it can't tell that Amoxicillin belongs to the penicillin family.
// That needs a medicine database on the backend, so the doctor's judgement still matters.

// "500mg", "5000", "2.5ml": a dose, not part of the medicine's name.
const isDose = (word: string) => /^\d+(\.\d+)?[a-zµ]*$/u.test(word);

const words = (text: string) =>
  text
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((w) => w && !isDose(w));

export function allergyMatch(medicine: string, allergies: string[]): string | null {
  const medicineWords = words(medicine);
  if (medicineWords.length === 0) return null;
  return (
    allergies.find((allergy) => {
      const allergyWords = words(allergy);
      return allergyWords.length > 0 && allergyWords.every((w) => medicineWords.includes(w));
    }) ?? null
  );
}
