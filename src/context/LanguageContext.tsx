import React, { createContext, useState, useContext } from 'react';

const dictionary = {
  fr: {
    agenda: 'Agenda', settings: 'Réglages', addEvent: 'Ajouter un événement',
    editEvent: 'Modifier l\'événement', titlePlaceholder: 'Titre (ex: Vacances, Rdv...)',
    descPlaceholder: 'Lieu, notes...', allDay: 'Toute la journée', start: 'Début (ex: 14:30)',
    end: 'Fin (ex: 15:30)', endDate: 'Date de fin (ex: 2026-11-15)', reminders: 'Rappels de notification',
    save: 'Sauvegarder', createEvent: 'Créer l\'événement', delete: 'Supprimer',
    minutes: 'Min', hours: 'H', days: 'J', assignTo: 'Attribuer à :',
    language: 'Langue de l\'application', copied: 'Copié ! 📋', copiedDesc: 'Le message et le code ont été copiés.',
    success: 'Succès', error: 'Erreur', warning: 'Attention', myAccount: 'Mon Compte',
    loggedInAs: 'Connecté en tant que :', changePassword: 'Changer mon mot de passe',
    deleteAccount: 'Supprimer mon compte', myFamily: 'Ma Famille', inviteCode: 'Code d\'invitation pour rejoindre ce calendrier :',
    share: 'Partager', copy: 'Copier', changeFamily: 'Changer de famille', comingSoon: 'Bientôt',
    multiFamilySoon: 'Le système multi-familles arrive bientôt !', appColor: 'Couleur de l\'application',
    groupMembers: 'Membres du groupe', tapToEdit: 'Touchez un membre pour le modifier',
    addMember: 'Ajouter un membre', editMember: 'Modifier le membre', memberNamePlaceholder: 'Nom du membre...',
    update: 'Mettre à jour', cancel: 'Annuler', customColorHint: 'Choisissez votre couleur personnalisée :',
    importPhone: 'Importer le téléphone', assignEventsTo: 'Choisissez à qui attribuer les événements :',
    importFor: 'Importer pour', logout: 'Se déconnecter', deleteAccountConfirm: 'Supprimer le compte ?',
    deleteAccountDesc: 'Cette action est irréversible. Toutes vos données seront effacées.', yesDelete: 'Oui, supprimer',
    titleRequired: 'Veuillez entrer un titre.', cloudError: 'Impossible de sauvegarder sur le cloud.',
    editError: 'Impossible de modifier cet événement.', deleteError: 'Impossible de supprimer cet événement.',
    keepOneMember: 'Vous devez garder au moins un membre.', permDenied: 'Permission refusée.',
    noCalendar: 'Aucun calendrier trouvé.', noEvents: 'Aucun événement à importer.',
    upToDate: 'Tout est déjà à jour ! Aucun nouvel événement à importer.', eventsSynced: 'nouveaux événements synchronisés dans le cloud !',
    loading: 'Chargement...', notConnected: 'Non connecté', passwordResetSent: 'Un e-mail de réinitialisation vous a été envoyé.',
    passwordResetError: 'Impossible d\'envoyer l\'e-mail.', reloginRequired: 'Veuillez vous déconnecter puis vous reconnecter avant de supprimer votre compte.',
    logoutError: 'Impossible de se déconnecter.', shareError: 'Impossible de partager le code.',
    shareMessage: 'Rejoins mon agenda partagé sur Syncro ! Code de famille :', emptyTitle: 'Le titre est obligatoire.',
    ok: 'OK', before: 'avant', 
    
    // NOUVEAUX TEXTES
    appearance: 'Apparence & Couleurs', theme: 'Thème', themeSystem: 'Système', themeLight: 'Clair', themeDark: 'Sombre',
    appBgColor: 'Fond de l\'application', numberColor: 'Numéros du calendrier', fabColor: 'Bouton Ajouter',
    selectColor: 'Choisir la couleur', eventsColorHint: 'Note : La couleur des cartes d\'événements correspond à la couleur attribuée à chaque membre ci-dessous.'
  },
  en: {
    agenda: 'Agenda', settings: 'Settings', addEvent: 'Add Event',
    editEvent: 'Edit Event', titlePlaceholder: 'Title (e.g. Holidays, Meeting...)',
    descPlaceholder: 'Location, notes...', allDay: 'All day', start: 'Start (e.g. 14:30)',
    end: 'End (e.g. 15:30)', endDate: 'End date (e.g. 2026-11-15)', reminders: 'Notification reminders',
    save: 'Save', createEvent: 'Create event', delete: 'Delete',
    minutes: 'Min', hours: 'H', days: 'D', assignTo: 'Assign to:',
    language: 'App Language', copied: 'Copied! 📋', copiedDesc: 'Message and code copied to clipboard.',
    success: 'Success', error: 'Error', warning: 'Warning', myAccount: 'My Account',
    loggedInAs: 'Logged in as:', changePassword: 'Change password',
    deleteAccount: 'Delete my account', myFamily: 'My Family', inviteCode: 'Invitation code for this calendar:',
    share: 'Share', copy: 'Copy', changeFamily: 'Change family', comingSoon: 'Coming soon',
    multiFamilySoon: 'Multi-family system is coming soon!', appColor: 'App Color',
    groupMembers: 'Group Members', tapToEdit: 'Tap a member to edit',
    addMember: 'Add a member', editMember: 'Edit member', memberNamePlaceholder: 'Member name...',
    update: 'Update', cancel: 'Cancel', customColorHint: 'Choose your custom color:',
    importPhone: 'Import Phone Calendar', assignEventsTo: 'Assign events to:',
    importFor: 'Import for', logout: 'Log out', deleteAccountConfirm: 'Delete account?',
    deleteAccountDesc: 'This action is irreversible. All your data will be erased.', yesDelete: 'Yes, delete',
    titleRequired: 'Please enter a title.', cloudError: 'Could not save to the cloud.',
    editError: 'Could not edit this event.', deleteError: 'Could not delete this event.',
    keepOneMember: 'You must keep at least one member.', permDenied: 'Permission denied.',
    noCalendar: 'No calendar found.', noEvents: 'No events to import.',
    upToDate: 'Everything is up to date! No new events to import.', eventsSynced: 'new events synced to the cloud!',
    loading: 'Loading...', notConnected: 'Not connected', passwordResetSent: 'A password reset email has been sent.',
    passwordResetError: 'Could not send the email.', reloginRequired: 'Please log out and log back in before deleting your account.',
    logoutError: 'Could not log out.', shareError: 'Could not share the code.',
    shareMessage: 'Join my shared calendar on Syncro! Family code:', emptyTitle: 'Title is required.',
    ok: 'OK', before: 'before',

    // NOUVEAUX TEXTES
    appearance: 'Appearance & Colors', theme: 'Theme', themeSystem: 'System', themeLight: 'Light', themeDark: 'Dark',
    appBgColor: 'App Background', numberColor: 'Calendar Numbers', fabColor: 'Add Button',
    selectColor: 'Select Color', eventsColorHint: 'Note: Event card colors are based on the color assigned to each member below.'
  }
};

export const LanguageContext = createContext<any>(null);

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
  const [lang, setLang] = useState<'fr' | 'en'>('fr');
  const t = (key: keyof typeof dictionary['fr']) => dictionary[lang][key] || key;

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslation = () => useContext(LanguageContext);