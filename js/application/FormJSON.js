/*
 | Copyright 2016 Esri
 |
 | Licensed under the Apache License, Version 2.0 (the "License");
 | you may not use this file except in compliance with the License.
 | You may obtain a copy of the License at
 |
 |    http://www.apache.org/licenses/LICENSE-2.0
 |
 | Unless required by applicable law or agreed to in writing, software
 | distributed under the License is distributed on an "AS IS" BASIS,
 | WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 | See the License for the specific language governing permissions and
 | limitations under the License.
 */
define([
  "dojo/_base/declare"
], function (
  declare
) {

  return declare(null, {

    //--------------------------------------------------------------------------
    //
    //  Public Methods
    //
    //--------------------------------------------------------------------------

    generate: function (fields) {
      var schemaJSON = this._createSchemaJSON(fields);
      var formJSON = this._createFormJSON(fields);

      return {
        schema: {
          type: "object",
          properties: schemaJSON
        },
        form: formJSON
      };

    },

    addFieldInfos: function (fieldInfos, formJSON) {
      var form = formJSON && formJSON.form;
      var formLen = form.length;
      var fieldInfosLen = fieldInfos && fieldInfos.length;
      if (formLen && fieldInfosLen) {
        fieldInfos.forEach(function (fieldInfo) {
          form.forEach(function (formItem) {
            if (formItem.key === fieldInfo.fieldName) {
              if (fieldInfo.label) {
                formItem.title = fieldInfo.label;
              }
              if (fieldInfo.tooltip) {
                formItem.description = fieldInfo.tooltip;
              }
            }
          });
        });

        form.sort(function (a, b) {
          var aIndex;
          var bIndex;
          fieldInfos.forEach(function (fieldInfo, i) {
            if (fieldInfo.fieldName === a.key) {
              aIndex = i;
            }
            else if (fieldInfo.fieldName === b.key) {
              bIndex = i;
            }
          });
          return aIndex - bIndex;
        });

      }
    },

    //--------------------------------------------------------------------------
    //
    //  Private Methods
    //
    //--------------------------------------------------------------------------

    _isValidField: function (field) {

      if ((field.hasOwnProperty("editable") && !field.editable) || field.type === "oid") {
        return false;
      }

      return true;
    },

    _createFieldFormJSON: function (field) {
      if (this._isValidField(field)) {

        var fieldForm = {
          "key": field.name,
          "title": field.alias || field.name
        };

        if (field.type === "string" && field.length >= 200) {
          fieldForm.type = "textarea";
        }

        var domain = field.domain;

        if (domain) {
          if (domain.type === "codedValue") {
            var titleMap = [];
            domain.codedValues.forEach(function (codedValue) {
              titleMap.push({
                value: codedValue.code,
                name: codedValue.name
              });
            });
            fieldForm.titleMap = titleMap;


            if (domain.codedValues.length < 4) {
              fieldForm.type = "radios";
            }

          }
        }

        return fieldForm;
      }
    },

    _createFormJSON: function (fields) {
      var form = [];

      fields.forEach(function (field) {
        var fieldFormJSON = this._createFieldFormJSON(field);
        if (fieldFormJSON) {
          form.push(fieldFormJSON);
        }
      }, this);

      return form;
    },

    _createFieldSchemaJSON: function (field) {

      if (this._isValidField(field)) {

        var schema = {
          "title": field.alias || field.name,
          "required": field.hasOwnProperty("nullable") ? !field.nullable : false
        };

        if (field.defaultValue) {
          schema.default = field.defaultValue;
        }

        var schemaType, schemaFormat;

        switch (field.type) {
          case "small-integer":
          case "integer":
            schemaType = "integer";
            break;
          case "single":
          case "double":
            schemaType = "number";
            break;
          case "date":
            schemaFormat = "date";
            schemaType = "string";
            break;
          default:
            schemaType = "string";
        }

        if (schemaFormat) {
          schema.format = schemaFormat;
        }

        if (field.type !== "date") {
          schema.maxLength = field.length || null;
        }

        var domain = field.domain;

        if (domain) {
          if (domain.type === "codedValue") {
            var menu = [];
            domain.codedValues.forEach(function (codedValue) {
              menu.push(codedValue.code);
            });
            schema.enum = menu;
          }
          if (domain.type === "range") {
            schema.minimum = domain.minValue;
            schema.maximum = domain.maxValue;
          }
        }

        schema.type = schemaType;

        return schema;
      }

    },

    _createSchemaJSON: function (fields) {
      var schema = {};
      fields.forEach(function (field) {
        var fieldSchema = this._createFieldSchemaJSON(field);
        if (fieldSchema) {
          schema[field.name] = fieldSchema;
        }
      }, this);
      return schema;
    }

  });
});
