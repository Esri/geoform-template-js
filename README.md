# geoform-template-js

![App](http://esri.github.io/geoform-template-js/images/item.png)

GeoForm is a configurable template for form based data editing of a [Feature Service](http://resources.arcgis.com/en/help/main/10.1/index.html#//0154000002w8000000). This application allows users to enter data through a form instead of a map’s pop-up while leveraging the power of the [Web Map](http://resources.arcgis.com/en/help/main/10.1/index.html#//00sp0000001z000000) and editable Feature Services. This will geo-enable data and support workflows by lowering the barrier of entry for completing simple tasks. This template can be used to  gather input from outside of an organization and collect valuable content for collaboration.

[Live Demo](http://esri.github.io/geoform-template-js/)

* **Map:** Choose the web map used in your application.
* **Title:** Customize the title of the application.
* **Logo:** Choose a logo to display in the application.
* **Description:** Describe the form.
* **Editable Layer:** Choose the editable Feature Service used for collecting the input data.
* **Fields:** Select which fields to display and collect data within the form.
* **Color Scheme:** Choose the color scheme of the application.
* **Mobile:** A responsive web application that adapts to a resolution using Twitter’s Bootstrap framework.
* **Share:** Enable sharing using Twitter or Facebook or email.

The GeoForm template can be accessed via the ArcGIS template gallery or item details. The application source code can be downloaded for further customization and hosted on your own web server.

## Instructions

1. Download and unzip the .zip file or clone the repo.
2. Web-enable the directory.
3. Access the .html page.
4. See the readme.html page for configuration options.

## Adding The Template To Your ArcGIS Online Organization

See how you can [add this template to your organization](http://blogs.esri.com/esri/arcgis/2014/04/21/be-an-early-adopter/) as an early adopter.

## More Information

See the [ArcGIS Blog post](http://blogs.esri.com/esri/arcgis/2014/07/08/editing-via-pop-ups-got-you-down/) for additional informationa bout this application.

## Offline Editing
This template supports editing offline using the Esri [Offline Editor JS](https://github.com/Esri/offline-editor-js). For more information on web offline editing see the github project linked above.

This template supports basic offline editing by saving the edits locally until a connection can be reestablished. As long as the browser window remains open or is reopened then the edits will get synched once an internet connection is restored.

Attachments are stored locally as well.

***IMPORTANT: If you want a full, robust offline solution then you should be using our ArcGIS Runtime SDKs for .NET, WPF, Java, iOS, Android and Qt.***

## Limitations

* Currently only supports point editable feature layers.
* Offline editing only supports storing applyEdits and submitting upon reconnection.
* Offline does not cache tiles or services. 

## Requirements

* Notepad or HTML editor
* A little background with Javascript
* Experience with the [ArcGIS Javascript API](http://www.esri.com/) would help.

## Bootstrap

This application uses the [Bootstrap](http://getbootstrap.com/) framework for CSS, layout, components and theming. [Bootstrap](https://github.com/twbs/bootstrap) on GitHub.

## Configuring The Template

This template includes an application builder. If you're using this template via ArcGIS.com, you can take advantage of this builder while logged into ArcGIS and by configuring the published application.

If you are not using ArcGIS Online applications, you can configure this template by editing the defaults.js in the config folder.

 [New to Github? Get started here.](https://github.com/)

## Configuring defaults.js

This topic will explain how to configure some of the more advanced settings in defaults.js

#### Webmap

Specify the webmap ID to use for this template.

    "webmap": "5fd247b0e5d844d99b7b9af36286a535",
    
#### Application ID

If you've configured an application instead of using just a webmap, place the application ID here.

    "appid": "be338760de9249f8b15df22a8e4ee586",

#### Defining the FeatureService Layer

Set the "form_layer" property to specify whic layer to use for generating the form. This is the ID of the layer as specified in a webmap. If you don't specify anything here, it will use the first feature layer it can find in the webmap.

For example, to use the layer from [this webmap](http://www.arcgis.com/home/item.html?id=0c5cb13c4fc54b28bb26a125221ed96f), I would inspect the [webmap response](http://www.arcgis.com/sharing/rest/content/items/0c5cb13c4fc54b28bb26a125221ed96f/data?f=pjson) to get the layer ID as so:

Setting the layer ID like so:
    
    "form_layer": {
        "id": "GeoFormTryItLive_v3_7854"
    },

#### Configuring Fields

By default, the fields property is an empty array. When an empty array, all fields from the layer will be dispalyed and they will use the default values. These fields can be configured by setting this fields array to tell the GeoForm what fields show and their properties. You can set each fields label, help text (optional description), visibility, default populated value and hint text (placeholder).

Default Fields property

    "fields": [],
    
Modified fields property

    fields:[{
        "name": "email", // field ID
        "alias": "Email", // label
        "fieldDescription": "Let us contact you.", // help text
        "visible": true, // show this field?
        "typeField": false, // subtype field?
        "tooltip": "test@test.com", // placeholder text
        "displayType": "email" // text, checkbox, radio, textarea, url, email
    }]

#### Configuring Application Details

The GeoForm title, description and logo can be customized. If they are left empty, they will use the webmap's default title, image and summary. If both are undefined, then the item will not show in the application.

    "details": {
        "Title": "My Custom Geoform",
        "Logo": "http://www.mysite.com/MyLogo.png",
        "Description": "Check out my GeoForm!"
    }

If you don't want them to appear, set them to false.

    "details": {
        "Title": false,
        "Logo": false,
        "Description": false
    }

#### Theme

Change the way this app looks by changing its theme. See the [themes.js](js/themes.js) file for all of the available options. These free themes for Bootstrap can be previewed on the [Bootswatch](http://bootswatch.com/) website.

    "theme": "bootstrap",

#### Reset Map Extent

If you'd like the map to be reset after each submission, set this option to true. If you dont want the map extent to return to its default when a submission occurs, set to false.

    "defaultMapExtent": true,

#### Attachment Text

Use this text option to tell users what kind of file to attach.

    "attachmentLabel": "Cat Image",
    "attachmentHelpText": "Select a cat photo!",

#### Use Small Header

This option will use smaller sized text for the GeoForm title and description instead of the larger [Bootstrap Jumbotron](http://getbootstrap.com/examples/jumbotron/)([2](http://getbootstrap.com/components/#jumbotron)).

    useSmallHeader": false,

#### Enable Sharing

This option displays sharing links when a submission occurs. If you wouldn't like to display the sharing links when a user submits an entry, set this option to false.

    "enableSharing": true,
    
#### Symbol

Set the symbol to use when a user selects a location. See the [pushpins.js](js/pushpins.js) file for all the available options. You can modify this file to add your own custom symbols.

    "pushpinColor": "grey",

#### Bit.ly API

In order to shorten the URL of the application, we use the bit.ly URL shortening service. Sign up for an account to get API credentials to enter here.

    "bitlyLogin": "myAccount",
    "bitlyKey": "myKey",

#### Sharing Host

Use this template in an ArcGIS organization or portal application by changing this sharinghost URL to point to the location of the portal or organizaton.

    "sharinghost": "http://myorg.maps.arcgis.com",

## Resources

* [ArcGIS for JavaScript API Resource Center](http://help.arcgis.com/en/webapi/javascript/arcgis/index.html)
* [ArcGIS Blog](http://blogs.esri.com/esri/arcgis/)
* [twitter@esri](http://twitter.com/esri)

## Issues

Find a bug or want to request a new feature?  Please let us know by submitting an issue.

## Contributing

Anyone and everyone is welcome to contribute. :)

## Licensing
Copyright 2012 Esri

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

A copy of the license is available in the repository's [license.txt](https://raw.github.com/esri/geoform-template-js/master/license.txt) file.

[](Esri Tags: ArcGIS ArcGIS Online Web Application GeoForm Geo Form template Public)
[](Esri Language: JavaScript)
