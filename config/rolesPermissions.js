export const rolesPermissions = {
    Admin: {
      canCRUD: true,
      manageUsers: true,
      auditLogs: true,
      grantDBAccess: true
    },
    Doctor: {
      canCreateDiagnosis: true,
      canViewAssignedPatients: true,
      canUpdateTreatmentNotes: true,
      canDeleteDrafts: true,
    },
    Patient: {
      canBookAppointment: true,
      canViewOwnPrescriptions: true,
      canEditProfile: true,
      canCancelAppointments: true,
    }
  };
  
  export default rolesPermissions;  