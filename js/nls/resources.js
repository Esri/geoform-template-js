define({
    root: ({
        map: {
            error: "Unable to create map"
        },
        onlineStatus: {
            offline: "You are currently working offline. Form submissions will be saved locally until a connection to the server can be made.",
            reconnecting: "Reconnecting&hellip;",
            pending: "${total} pending edit(s) will be submitted when a network connection is re-established."
        },
        configure: {
            mapdlg: {
                items: {
                    organizationLabel: "My Organization",
                    onlineLabel: "ArcGIS Online",
                    contentLabel: "My Content",
                    favoritesLabel: "My Favorites"
                },
                title: "Select Web Map",
                searchTitle: "Search",
                ok: "Ok",
                cancel: "Cancel",
                placeholder: "Enter search term"
            },
            groupdlg: {
                items: {
                    organizationLabel: "My Organization",
                    onlineLabel: "ArcGIS Online",
                    contentLabel: "My Content",
                    favoritesLabel: "My Favorites"
                },
                title: "Select Group",
                searchTitle: "Search",
                ok: "Ok",
                cancel: "Cancel",
                placeholder: "Enter search term"
            }
        },
        user: {
            mgrs: "MGRS",
            usng: "USNG",
            utm: "UTM",
            utm_northing: "Northing",
            utm_easting: "Easting",
            utm_zone_number: "Zone Number",
            geoFormGeneralTabText: "1. Enter Information",
            locationInformationText: "2. Select Location",
            submitInformationText: "3. Complete Form",
            submitInstructions: "Add this information to the map.",
            myLocationText: "Current Location",
            locationDescription: "Specify the location for this entry by clicking/tapping the map or by using one of the following options.",
            addressText: "Search",
            geographic: "Geographic",
            locationTabText: "Location",
            locationPopupTitle: "Selected Location",
            submitButtonText: "Submit entry",
            submitButtonTextLoading: "Submitting&hellip;",
            formValidationMessageAlertText: "The following fields are required:",
            selectLocation: "Please select a ${openLink}location${closeLink} for your submission.",
            emptylatitudeAlertMessage: "Please enter a ${openLink}latitude${closeLink} coordinate.",
            emptylongitudeAlertMessage: "Please enter a ${openLink}longitude${closeLink} coordinate.",
            shareUserTitleMessage: "Thank you for your contribution!",
            shareUserTextMessage: "Your entry has been submitted. Share this form with others using the following options",
            addAttachmentFailedMessage: "Unable to add attachment to layer",
            addFeatureFailedMessage: "Unable to add feature to layer",
            noLayerConfiguredMessage: "Whoops! Nothing to see here. In order to start collecting form submissions, configure this GeoForm and select an editable Feature Service layer to use.",
            placeholderLatitude: "Latitude (Y)",
            placeholderLongitude: "Longitude (X)",
            latitude: "Latitude",
            longitude: "Longitude",
            findMyLocation: "Locate me",
            finding: "Locating&hellip;",
            backToTop: "Back to top",
            myLocationTitleText: 'My Location',
            addressSearchText: "Your submission will appear here. You can drag the pin to correct the location.",
            shareModalFormText: "Form Link",
            close: "Close",
            locationNotFound: "Location could not be found.",
            setLocation: "Set Location",
            find: "Zip Code, city, etc.",
            attachment: "Attachment",
            toggleDropdown: "Toggle Dropdown",
            invalidLatLong: "Please enter valid ${latLink}latitude${closeLink} and ${lngLink}longitude${closeLink} coordinates.",
            invalidUTM: "Please enter valid ${openLink}UTM${closeLink} coordinates.",
            invalidUSNG: "Please enter valid ${openLink}USNG${closeLink} coordinates.",
            invalidMGRS: "Please enter valid ${openLink}MGRS${closeLink} coordinates.",
            geoformTitleText: "GeoForm",
            domainDefaultText:"Select&hellip;",
            applyEditsFailedMessage: "Sorry your entry cannot be submitted. Please try again.",
            requiredFields: "There are some errors. Please correct them below.",
            requiredField: "(required)",
            error: "Error",
            textRangeHintMessage: "${openStrong}Hint:${closeStrong} Minimum value ${minValue} and Maximum value ${maxValue}",
            dateRangeHintMessage: "${openStrong}Hint:${closeStrong} Minimum Date ${minValue} and Maximum Date ${maxValue}"
        }
    })
});