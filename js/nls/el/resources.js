﻿define(
   ({
    map: {
      error: "Δεν είναι δυνατή η δημιουργία χάρτη"
    },
    onlineStatus: {
      offline: "Αυτή τη στιγμή εργάζεστε χωρίς σύνδεση. Η συλλογή στοιχείων θα αποθηκεύεται τοπικά μέχρι να είναι δυνατή η σύνδεση με το διακομιστή.",
      reconnecting: "Επανασύνδεση&hellip;",
      pending: "Θα υποβληθούν ${total} εκκρεμείς αλλαγές όταν αποκατασταθεί η σύνδεση δικτύου."
    },
    configure: {
      mapdlg: {
        items: {
          organizationLabel: "Οργανισμός",
          onlineLabel: "ArcGIS Online",
          contentLabel: "Περιεχόμενo",
          favoritesLabel: "Τα Αγαπημένα μου"
        },
        title: "Επιλογή web χάρτη",
        searchTitle: "Αναζήτηση",
        ok: "ΟΚ",
        cancel: "Άκυρο",
        placeholder: "Εισαγάγετε όρο αναζήτησης"
      },
      groupdlg: {
        items: {
          organizationLabel: "Οργανισμός",
          onlineLabel: "ArcGIS Online",
          contentLabel: "Περιεχόμενo",
          favoritesLabel: "Τα Αγαπημένα μου"
        },
        title: "Επιλογή ομάδας",
        searchTitle: "Αναζήτηση",
        ok: "ΟΚ",
        cancel: "Άκυρο",
        placeholder: "Εισαγάγετε όρο αναζήτησης"
      },
      sharedlg: {
        items: {},
        mailtoLinkDescription: "Ακολουθεί ένας σύνδεσμος σε GeoForm"
      }
    },
    user: {
      all: "Όλοι",
      mgrs: "MGRS",
      usng: "USNG",
      utm: "UTM",
      utm_northing: "Κατακόρυφη συντεταγμένη",
      utm_easting: "Οριζόντια συντεταγμένη",
      utm_zone_number: "Αριθμός ζώνης",
      selectLayerTabText: "${formSection} Επιλέξτε φόρμα",
      geoFormGeneralTabText: "${formSection} Εισαγάγετε πληροφορίες",
      locationInformationText: "${formSection} Επιλέξτε τοποθεσία",
      submitInformationText: "${formSection} Συμπληρώστε τη φόρμα",
      submitInstructions: "Προσθέστε τις πληροφορίες αυτές στο χάρτη.",
      myLocationText: "Τρέχουσα τοποθεσία",
      locationDescriptionForMoreThanOneOption: "Καθορίστε την τοποθεσία για αυτήν την καταχώριση κάνοντας κλικ / πατώντας στο χάρτη ή χρησιμοποιώντας μία από τις παρακάτω επιλογές.",
      locationDescriptionForOneOption: "Καθορίστε την τοποθεσία για αυτήν την καταχώριση κάνοντας κλικ / πατώντας στο χάρτη ή χρησιμοποιώντας την παρακάτω επιλογή.",
      locationDescriptionForNoOption: "Καθορίστε την τοποθεσία για αυτήν την καταχώριση κάνοντας κλικ / πατώντας στο χάρτη.",
      addressText: "Αναζήτηση",
      geographic: "Γεωγρ. πλάτος/μήκος",
      locationTabText: "Τοποθεσία",
      locationPopupTitle: "Τοποθεσία",
      submitButtonText: "Υποβολή καταχώρισης",
      submitButtonTextLoading: "Υποβολή&hellip;",
      formValidationMessageAlertText: "Τα παρακάτω πεδία είναι απαιτούμενα:",
      selectLocation: "Επιλέξτε μια τοποθεσία για την υποβολή σας.",
      emptylatitudeAlertMessage: "Εισαγάγετε μια συντεταγμένη ${openLink}γεωγραφικού πλάτους${closeLink}.",
      emptylongitudeAlertMessage: "Εισαγάγετε μια συντεταγμένη ${openLink}γεωγραφικού μήκους${closeLink}.",
      shareUserTitleMessage: "Σας ευχαριστούμε για τη συνεισφορά σας!",
      entrySubmitted: "Η καταχώρισή σας έχει υποβληθεί στο χάρτη.",
      shareThisForm: "Κοινοποιήστε αυτήν τη φόρμα",
      shareUserTextMessage: "Πείτε σε άλλους να συνεισφέρουν χρησιμοποιώντας τις παρακάτω επιλογές.",
      addAttachmentFailedMessage: "Δεν είναι δυνατή η προσθήκη συνημμένου στο θεματικό επίπεδο",
      addFeatureFailedMessage: "Δεν είναι δυνατή η προσθήκη του στοιχείου στο θεματικό επίπεδο",
      noLayerConfiguredMessage: "Παρουσιάστηκε σφάλμα κατά τη φόρτωση ή την εύρεση ενός επεξεργάσιμου επιπέδου στοιχείων. Για να εμφανίσετε τη φόρμα και να αρχίσετε να συλλέγετε στοιχεία, προσθέστε ένα επεξεργάσιμο επίπεδο στοιχείων στο web χάρτη.",
      placeholderLatitude: "Γεωγραφικό πλάτος (Y)",
      placeholderLongitude: "Γεωγραφικό μήκος (X)",
      latitude: "Γεωγραφικό πλάτος",
      longitude: "Γεωγραφικό μήκος",
      findMyLocation: "Εντοπισμός της θέσης μου",
      finding: "Εντοπισμός&hellip;",
      backToTop: "Επιστροφή στην κορυφή",
      addressSearchText: "Η υποβολή σας θα εμφανιστεί εδώ. Μπορείτε να σύρετε την καρφίτσα για να διορθώσετε την τοποθεσία.",
      shareModalFormText: "Σύνδεσμος φόρμας",
      close: "Κλείσιμο",
      locationNotFound: "Δεν ήταν δυνατή η εύρεση της τοποθεσίας.",
      setLocation: "Ορισμός τοποθεσίας",
      find: "Βρείτε μια διεύθυνση ή ένα μέρος",
      attachment: "Συνημμένο",
      toggleDropdown: "Εναλλαγή πτυσσόμενης λίστας",
      invalidString: "Εισαγάγετε μια έγκυρη τιμή.",
      invalidSmallNumber: "Εισαγάγετε μια έγκυρη τιμή μεταξύ ${openStrong}ακεραίου${closeStrong μεταξύ -32768 και 32767.",
      invalidNumber: "Εισαγάγετε μια έγκυρη ${openStrong}ακέραιη${closeStrong} τιμή μεταξύ -2147483648 και 2147483647.",
      invalidFloat: "Εισαγάγετε μια έγκυρη τιμή ${openStrong}κινητής υποδιαστολής${closeStrong}.",
      invalidDouble: "Εισαγάγετε μια έγκυρη τιμή ${openStrong}κινητής υποδιαστολής διπλής ακρίβειας${closeStrong}.",
      invalidLatLong: "Εισαγάγετε έγκυρες συντεταγμένες γεωγραφικού πλάτους και μήκους.",
      invalidUTM: "Εισαγάγετε έγκυρες συντεταγμένες UTM.",
      invalidUSNG: "Εισαγάγετε έγκυρες συντεταγμένες USNG.",
      invalidMGRS: "Εισαγάγετε έγκυρες συντεταγμένες MGRS.",
      geoformTitleText: "GeoForm",
      domainDefaultText: "Επιλέξτε&hellip;",
      applyEditsFailedMessage: "Λυπούμαστε, δεν είναι δυνατή η υποβολή της καταχώρισής σας. Δοκιμάστε ξανά.",
      requiredFields: "Το ακόλουθο πεδίο είναι υποχρεωτικό. Εισαγάγετε μια έγκυρη καταχώρηση.",
      requiredField: "(απαιτούμενο)",
      error: "Σφάλμα",
      textRangeHintMessage: "${openStrong}Υπόδειξη:${closeStrong} ελάχιστη τιμή ${minValue} και μέγιστη τιμή ${maxValue}",
      dateRangeHintMessage: "${openStrong}Υπόδειξη:${closeStrong} ελάχιστη ημερομηνία ${minValue} και μέγιστη ημερομηνία ${maxValue}",
      remainingCharactersHintMessage: "Απομένουν ${value} χαρακτήρες",
      mapFullScreen: "Πλήρης οθόνη",
      mapRestore: "Επαναφορά",
      filterSelectEmptyText: "Επιλογή",
      invalidLayerMessage: "Đ_A valid layer to create the GeoForm was not found. If the GeoForm has been configured with a layer, the layer may no longer be available, or authorization failed__________________________________________________ớ.",
      selectedLayerText: "Όλα",
      fileUploadStatus: "Κατάσταση μεταφόρτωσης αρχείου",
      uploadingBadge: "&nbsp;Μεταφόρτωση&hellip;",
      successBadge: "&nbsp;Μεταφορτώθηκε",
      retryBadge: "Επανάληψη",
      errorBadge: "Σφάλμα στη μεταφόρτωση&nbsp;&nbsp;&nbsp;",
      fileTooLargeError: "Το αρχείο είναι πολύ μεγάλο για επισύναψη",
      exceededFileCountError: "Υπέρβαση του μέγιστου επιτρεπόμενου αριθμού συνημμένων",
      selectFileTitle: "Επιλέξτε ένα αρχείο",
      btnSelectFileText: "Επιλογή αρχείου",
      btnViewSubmissions: "Προβολή υποβολών"
    },
    builder: {
      gettingStarted: "Ξεκινήστε τη χρήση",
      dateSettings: "Ρυθμίσεις ημερομηνίας",
      hiddenDateField: "Απόκρυψη αυτού του πεδίου ημερομηνίας",
      preventPastDates: "Αποτροπή περασμένων ημερομηνιών",
      preventFutureDates: "Αποτροπή μελλοντικών ημερομηνιών",
      useCurrentDate: "Ρυθμίστε αυτό το πεδίο με την τρέχουσα ημερομηνία και ώρα",
      configure: "Διαμόρφωση",
      configureField: "Παραμετροποίηση πεδίου \'${fieldName}\'",
      invalidUser: "Λυπούμαστε, δεν έχετε δικαίωμα προβολής αυτού του αντικειμένου",
      invalidWebmapSelectionAlert: "Ο επιλεγμένος web χάρτης δεν περιέχει ένα έγκυρο θεματικό επίπεδο για χρήση. Προσθέστε ένα επεξεργάσιμο Feature Layer στο web χάρτη για να συνεχίσετε.",
      invalidWebmapSelectionAlert2: "Για περισσότερες πληροφορίες, ανατρέξτε στο άρθρο ${openLink}Τι είναι το Feature Service;${closeLink}",
      selectFieldsText: "Επιλογή πεδίων φόρμας",
      selectThemeText: "Επιλογή θέματος φόρμας",
      setViewerText: "Ρύθμιση Εργαλείου προβολής",
      introText: "Έναρξη",
      webmapText: "Web χάρτης",
      layerText: "Θεματικό επίπεδο",
      detailsText: "Λεπτομέρειες",
      fieldsText: "Πεδία",
      styleText: "Στυλ",
      viewerText: "Χρήστης μόνο για ανάγνωση",
      optionText: "Επιλογές",
      previewText: "Προεπισκόπηση",
      publishText: "Δημοσίευση",
      optionsApplicationText: "Επιλογές",
      submitButtonText: "Đ_Submit Button Text (Optional)__________ớ",
      submitButtonDesc: "Đ_Optionally label the button to submit a new entry. This text will not be translated__________________________ớ.",
      viewSubmissionsText: "Đ_View Submissions Text (Optional)___________ớ",
      viewSubmissionsDesc: "Đ_Optionally label the button to view existing entries. This text will not be translated___________________________ớ.",
      titleText: "Εργαλείο δημιουργίας",
      descriptionText: "Το GeoForm είναι ένα πρότυπο, με δυνατότητα διαμόρφωσης, για επεξεργασία δεδομένων ενός ${link1}Feature Service${closeLink} μέσω φόρμας . Η εφαρμογή αυτή επιτρέπει στους χρήστες να εισάγουν δεδομένα μέσω μιας φόρμας αντί ενός αναδυόμενου παραθύρου του χάρτη, αξιοποιώντας παράλληλα την ισχύ του ${link2}web χάρτη${closeLink} και των επεξεργάσιμων Feature Service. Ακολουθήστε τα παρακάτω βήματα για να προσαρμόσετε και να υλοποιήσετε το GeoForm σας.",
      btnPreviousText: "Προηγούμενο",
      btnNextText: "Επόμενο",
      webmapTabTitleText: "Επιλογή web χάρτη",
      viewWebmap: "Προβολή web χάρτη",
      webmapDetailsText: "Ο επιλεγμένος web χάρτης είναι ${webMapTitleLink}${webMapTitle}${closeLink}. Για να επιλέξετε έναν διαφορετικό web χάρτη, κάντε κλικ στο κουμπί 'Επιλογή web χάρτη'.",
      btnSelectWebmapText: "Επιλέξτε web χάρτη",
      btnSelectWebmapTextLoading: "Φόρτωση&hellip;",
      layerTabTitleText: "Επιλογή θεματικών επεξεργάσιμων επιπέδων",
      selectLayerLabelText: "Θεματικό επίπεδο",
      selectLayerDefaultOptionText: "Επιλογή θεματικού επιπέδου",
      enableBasemapToggle: "Εμφάνιση κουμπιού Εναλλαγής υποβάθρου",
      enableBasemapToggleDescription: "Μπορείτε να παραμετροποιήσετε το GeoForm για εμφάνιση/απόκρυψη του κουμπιού Εναλλαγής υποβάθρου",
      defaultBasemap: "Εναλλαγή υποβάθρου",
      secondaryBasemap: "Προκαθορισμένο υπόβαθρο",
      detailsTabTitleText: "Λεπτομέρειες φόρμας",
      detailTitleLabelText: "Τίτλος",
      detailLogoLabelText: "Εικόνα λογοτύπου",
      descriptionLabelText: "Οδηγίες και λεπτομέρειες φόρμας",
      fieldDescriptionLabelText: "Κείμενο βοήθειας (προαιρετικό)",
      fieldDescriptionHelpText: "Δώστε μια σύντομη περιγραφή ή οδηγίες για αυτό το πεδίο.",
      fieldHintHelpText: "Κείμενο υπόδειξης για το πεδίο.",
      fieldTabFieldHeaderText: "Πεδίο",
      fieldTabLabelHeaderText: "Ετικέτα",
      fieldTabDisplayTypeHeaderText: "Εμφάνιση ως",
      fieldTabOrderColumnText: "Σειρά",
      fieldTabVisibleColumnText: "Ενεργοποιημένες",
      displayFieldText: "Πεδίο εμφάνισης",
      selectMenuOption: "Μενού επιλογής",
      selectRadioOption: "Κουμπί επιλογής",
      selectTextOption: "Κείμενο",
      selectDateOption: "Επιλογή ημερομηνίας",
      selectRangeOption: "Πλαίσιο αυξομείωσης τιμών",
      selectCheckboxOption: "Κουτί επιλογής",
      selectMailOption: "Email",
      selectUrlOption: "URL",
      selectTextAreaOption: "Περιοχή κειμένου",
      previewApplicationText: "Προεπισκόπηση εφαρμογής",
      saveApplicationText: "Αποθήκευση εφαρμογής",
      saveText: "Αποθήκευση",
      toggleNavigationText: "Εναλλαγή πλοήγησης",
      formPlaceholderText: "Η φόρμα μου",
      shareBuilderInProgressTitleMessage: "Δημοσίευση του GeoForm",
      shareBuilderProgressBarMessage: "Περιμένετε&hellip;",
      shareBuilderTitleMessage: "Επιτυχία! Το αντικείμενο αποθηκεύτηκε",
      shareBuilderTextMessage: "Μπορείτε να αρχίσετε να συλλέγετε πληροφορίες με κοινοποίηση σε άλλους",
      shareModalFormText: "Σύνδεσμος φόρμας",
      shareBuilderSuccess: "Το GeoForm σας έχει ενημερωθεί και δημοσιευτεί!",
      geoformTitleText: "Geo Form",
      layerTabText: "Αυτά είναι τα θεματικά επίπεδα από τα οποία θα δημιουργηθεί το GeoForm. Το θεματικό επίπεδο πρέπει να είναι ένα feature service που έχει ενεργοποιηθεί για επεξεργασία, με κατάλληλα δικαιώματα κοινοποίησης για το κοινό σας. Εάν επιλεγούν όλα τα θεματικά επίπεδα, η φόρμα θα επιτρέπει στους χρήστες να επιλέγουν ποιο θεματικό επίπεδο φόρμας θα υποβάλουν.",
      detailsTabText: "Χρησιμοποιήστε τα παρακάτω πλαίσια Λεπτομέρειες φόρμας για να προσαρμόσετε τον τίτλο, να προσθέσετε ένα προσαρμοσμένο λογότυπο και να καταχωρίσετε μια σύντομη περιγραφή για το κοινό του GeoForm σας. Στην περιγραφή μπορείτε να προσθέσετε συνδέσμους προς άλλους πόρους, στοιχεία επικοινωνίας, ακόμη και να κατευθύνετε το κοινό σας σε μια διαδικτυακή χαρτογραφική εφαρμογή που παρουσιάζει όλα τα δεδομένα που συλλέγονται με το GeoForm.",
      fieldsTabText: "Εδώ μπορείτε να επιλέξετε ποια πεδία θα είναι ορατά στο κοινό του GeoForm σας, να επεξεργαστείτε τις ετικέτες που θα βλέπει και να προσθέσετε μια σύντομη περιγραφή για να διευκολύνετε την εισαγωγή δεδομένων.",
      styleTabText: "Διαμορφώστε το GeoForm σας χρησιμοποιώντας τα παρακάτω θέματα με βάση τις προτιμήσεις σας.",
      viewerTabText: "Ορίστε τις επιλογές για την προβολή υποβολών που έχουν συλλεχθεί από το GeoForm.",
      publishTabText: "Εάν έχετε ολοκληρώσει την προσαρμογή του GeoForm σας, αποθηκεύστε την εφαρμογή και αρχίστε να την κοινοποιείτε στο κοινό σας. Μπορείτε οποιαδήποτε στιγμή να επιστρέψετε σε αυτό το Εργαλείο δημιουργίας και να συνεχίσετε την προσαρμογή με βάση τις παρατηρήσεις.",
      headerSizeLabel: "Μέγεθος κεφαλίδας",
      smallHeader: "Χρήση μικρής κεφαλίδας",
      bigHeader: "Χρήση μεγάλης κεφαλίδας",
      pushpinText: "Πινέζα",
      doneButtonText: "Αποθήκευση και έξοδος",
      fieldTabPlaceHolderHeaderText: "Υπόδειξη (προαιρετικά)",
      enableAttachmentLabelText: "${openStrong}Ενεργοποίηση συνημμένων${closeStrong}",
      enableAttachmentLabelHint: "Μπορείτε να ενεργοποιήσετε/απενεργοποιήσετε τα συνημμένα εδώ",
      attachmentIsRequiredLabelText: "${openStrong}Απαιτείται συνημμένο${closeStrong}",
      attachmentIsRequiredLabelHint: "Εάν χρειάζεται, μπορεί να ζητηθεί από τους χρήστες να εισαγάγουν ένα συνημμένο.",
      attachmentLabelText: "Ετικέτα κουμπιού Επισύναψη",
      attachmentLabelHint: "Αυτό το κείμενο θα εμφανίζεται δίπλα στο κουμπί Επισύναψη. Μπορείτε να χρησιμοποιήσετε αυτόν το χώρο για να περιγράψετε τι θέλετε να επισυνάπτει το κοινό σας (φωτογραφία, βίντεο, έγγραφο κ.λπ.), τη μορφή αρχείου που ζητάτε (.jpeg, .png, .docx, .pdf κ.λπ.) και τυχόν πρόσθετες οδηγίες.",
      attachmentDescription: "Περιγραφή συνημμένου",
      attachmentHint: "Εάν χρειάζεται, μπορείτε εδώ να δώσετε πρόσθετες οδηγίες σχετικά με τα συνημμένα.",
      jumbotronDescription: "Χρησιμοποιήστε μεγάλη ή μικρή κεφαλίδα για τη φόρμα σας. Μια μεγάλη κεφαλίδα μπορεί να βοηθάει στον καθορισμό του σκοπού της εφαρμογής σας, αλλά καταλαμβάνει περισσότερο χώρο στην οθόνη σας.",
      shareGeoformText: "Κουμπιά κοινοποίησης στα μέσα κοινωνικής δικτύωσης",
      shareDescription: "Τα κουμπιά κοινωνικών δικτύων επιτρέπουν στο κοινό σας να κοινοποιήσει εύκολα το GeoForm αφού προηγουμένως έχουν πραγματοποιήσει μια υποβολή",
      defaultMapExtent: "Προκαθορισμένη έκταση χάρτη",
      defaultMapExtentDescription: "Στο web χάρτη σας  μετά την υποβολή, θα γίνει επαναφορά στην προκαθορισμένη έκταση - αυτό μπορεί να απενεργοποιηθεί οποιαδήποτε στιγμή.",
      pushpinOptionsDescription: "Επιλέξτε από μια ποικιλία χρωμάτων για την πινέζα του χάρτη, η οποία θα πρέπει να διαφέρει από τα σύμβολα του χάρτη ώστε ο χρήστης να τοποθετεί εύκολα την υποβολή του στο χάρτη",
      selectLocationText: "Επιλογή τοποθεσίας με βάση",
      myLocationText: "Η τοποθεσία μου",
      searchText: "Αναζήτηση",
      coordinatesText: "Συντεταγμένες γεωγραφικού πλάτους και μήκους",
      usng: "Συντεταγμένες USNG",
      mgrs: "Συντεταγμένες MGRS",
      utm: "Συντεταγμένες UTM",
      selectLocationSDescription: "Δώστε τη δυνατότητα στους χρήστες να επιλέξουν μια τοποθεσία χρησιμοποιώντας αυτές τις μεθόδους.",
      dragTooltipText: "Σύρετε το πεδίο εκεί που θέλετε να εμφανίζεται",
      showHideLayerText: "Εμφάνιση θεματικού επιπέδου",
      showHideLayerHelpText: "Μπορείτε να παραμετροποιήσετε το GeoForm για εμφάνιση/απόκρυψη του θεματικού επιπέδου. Αυτή η επιλογή ισχύει μόνο για παραμετροποίηση ενός θεματικού επιπέδου.",
      enableOfflineSupport: "Đ_Enable offline support________ớ",
      enableOfflineSupportHelpText: "Đ_Store submissions when there is no network connection and submit them when a connection is restored_______________________________ớ.",
      labelHelpMessage: "Ετικέτα",
      placeHolderHintMessage: "Κείμενο υπόδειξης",
      placeHolderHelpMessage: "Κείμενο βοήθειας",
      selectTextOptionValue: "Επιλογή φίλτρου",
      disableLogo: "Απενεργοποίηση λογοτύπου",
      disableLogoDescription: "Μπορείτε να διαμορφώσετε το GeoForm ώστε να γίνεται εμφάνιση/απόκρυψη του λογοτύπου στην κεφαλίδα φόρμας",
      locateOnLoadText: "Εντοπισμός κατά τη φόρτωση",
      locateOnLoadDescription: "Μπορείτε να διαμορφώσετε το GeoForm ώστε να γίνεται χρήση της τρέχουσας τοποθεσίας κατά τη φόρτωση της σελίδας",
      selectLayerFieldTabText: "Επιλογή θεματικού επιπέδου",
      allLayerSelectOptionText: "Όλα τα επίπεδα",
      disableViewer: "Απενεργοποίηση εργαλείου προβολής",
      disableViewerDescription: "Μπορείτε να παραμετροποιήσετε το GeoForm για εμφάνιση/απόκρυψη του Εργαλείου προβολής",
      displayFieldHintText: "Το επιλεγμένο πεδίο εμφάνισης θα εμφανίζεται στο Εργαλείο προβολής ως τίτλος"
    },
    viewer: {
      geocoderCancelText: "Άκυρο",
      viewMapTabText: "Χάρτης",
      sortHeaderText: "Ταξινόμηση κατά:",
      geocoderPlaceholderText: "Ταχυδρομικός κώδικας, πόλη κ.λπ.",
      noSearchResult: "Δεν βρέθηκε αποτέλεσμα",
      legendTabTooltip: "Υπόμνημα",
      aboutUsTabTooltip: "Σχετικά με  εμάς",
      mapTabTooltip: "Χάρτης",
      btnDescendingText: "Φθίνουσα",
      btnAscendingText: "Αύξουσα",
      geometryUnavailableErrorMessage: "Σφάλμα κατά την εύρεση της γεωμετρίας του στοιχείου",
      infoPopupOffErrorMessage: "Δεν υπάρχουν πληροφορίες για εμφάνιση",
      btnLoadMoreText: "Φόρτωση περισσότερων δεδομένων",
      unavailableTitleText: "Χωρίς τίτλο",
      unavailableConfigMessage: "Δεν είναι δυνατή η φόρτωση της διαμόρφωσης",
      share: "Κοινοποίηση",
      viewReportsTabText: "Αναφορές",
      viewLegendTabText: "Υπόμνημα",
      viewAboutusTabText: "Πληροφορίες",
      appLoadingFailedMessage: "Παρουσιάστηκε σφάλμα κατά τη φόρτωση του Εργαλείου προβολής"
    }
  })
);