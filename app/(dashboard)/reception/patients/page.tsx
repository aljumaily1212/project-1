import { PatientHistoryPage } from "@/components/patient-history";

// Reception sees the patient's details, appointments and payments, but not the medical file.
export default function ReceptionPatientsPage() {
  return <PatientHistoryPage medical={false} />;
}
