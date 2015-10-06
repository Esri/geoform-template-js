define([
  "dojo/_base/declare",
  "dojo/_base/lang",
  "dojo/Evented",
  "dojo/dom-attr",
  "dojo/dom-class",
  "dojo/i18n!./nls/Pagination",
  "dojo/on",
  "dojo/query",
  "dojo/text!./Pagination/templates/Pagination.html",
  "dojo/number",
  "dojo/string",
  "dijit/_TemplatedMixin",
  "dijit/_WidgetBase",
  "dijit/a11yclick"
],
  function (declare, lang, Evented, domAttr, domClass, i18n, on, query, template, number, string, _TemplatedMixin, _WidgetBase, a11yclick) {
    var Pagination = declare([_WidgetBase, _TemplatedMixin, Evented], {
      // dijit HTML
      templateString: template,
      declaredClass: "dijit.Pagination",
      constructor: function (options, srcRefNode) {
        // css class names
        this.css = {
          active: "active",
          pagination: "pagination",
          disabled: "disabled",
          glyphicon: "glyphicon",
          left: "glyphicon-menu-left",
          right: "glyphicon-menu-right",
          pageInfo: "page-info",
          hiddenXS: "hidden-xs",
          hiddenSM: "hidden-sm",
          hiddenMD: "hidden-md",
          hiddenLG: "hidden-lg"
        };
        // defaults
        this.options = {
          total: 0,
          num: 10,
          page: 1,
          pagesPerSide: 1,
          showPreviousNext: true,
          showFirstLast: true,
          theme: "dojoPage"
        };
        // mix in settings and defaults
        var defaults = lang.mixin({}, this.options, options);
        // properties
        this.set("theme", defaults.theme);
        this.set("total", defaults.total);
        this.set("num", defaults.num);
        this.set("page", defaults.page);
        this.set("pagesPerSide", defaults.pagesPerSide);
        this.set("showPreviousNext", defaults.showPreviousNext);
        this.set("showFirstLast", defaults.showFirstLast);
        // containing node
        this.domNode = srcRefNode;
        // Internationalization
        this._i18n = i18n;
        this._dataAttr = "data-page";
        this._dataAttrDisabled = "disabled";
        this._itemTemplate = "<li role=\"button\" class=\"${className}\"><a href=\"#\" title=\"${title}\" aria-label=\"${title}\" " + this._dataAttr + "=\"${page}\">${text}</a></li>";
      },
      /* ---------------- */
      /* Public Functions */
      /* ---------------- */
      // start widget
      startup: function () {
        this.set("page", this.page);
        // set widget ready
        this.set("loaded", true);
        this.emit("load", {});
      },

      postCreate: function () {
        // setup connections
        this.own(on(this.listNode, on.selector("[" + this._dataAttr + "]", a11yclick), lang.hitch(this, function (evt) {
          if (!this.disabled) {
            var target = evt.target;
            var pg = domAttr.get(target, this._dataAttr);
            if (pg && pg !== this._dataAttrDisabled) {
              // disable more clicking for now
              this.set("disabled", true);
              // all selected items
              var items = query("." + this.css.active, this.listNode);
              // remove selected class
              for (var i = 0; i < items.length; i++) {
                domClass.remove(items[i], this.css.active);
              }
              // add selected class
              domClass.add(target, this.css.active);
              // get offset number
              var selectedPage = parseInt(pg, 10);
              // set new page
              this.set("page", selectedPage);
            }
            evt.preventDefault();
            evt.stopPropagation();
          }
        })));
      },

      render: function () {
        // variables
        this._html = "";
        var tpl;
        this._startHTML = "";
        this._middleHTML = "";
        this._endHTML = "";
        this._middleCount = 0;
        this._lastMiddle = 0;
        this._firstMiddle = 0;
        this._npCount = 0;
        this._helipText = "";
        this._totalMiddlePages = (2 * this.pagesPerSide) + 1;
        this._helipText = i18n.pagination.helip || "";
        this.currentResultStart = this.page * this.num;
        this.currentResultEnd = this.currentResultStart + this.num;
        // if pagination is necessary
        if (this.num && (this.total > this.num)) {
          // determine offset links
          if (this.page) {
            this._currentIndex = parseInt(this.page, 10);
          } else {
            this._currentIndex = 1;
          }
          // first link
          this._firstPage = 1;
          // previous link
          this._previousPage = this._currentIndex - 1;
          // next link
          this._nextPage = this._currentIndex + 1;
          // last link
          this.totalPages = Math.ceil(this.total / this.num);
          // determine next and previous count
          if (this.showPreviousNext) {
            this._npCount = 2;
          }
          // determine pagination total size
          this._paginationCount = this._npCount + this._totalMiddlePages;
          // if pages matches size of pagination
          if (this.totalPages === this._totalMiddlePages) {
            this._helipText = "";
          }
          // pagination previous
          if (this.showPreviousNext) {
            var firstClass = this.css.disabled,
              firstOffset = "";
            if (this._currentIndex > 1) {
              firstClass = "";
              firstOffset = this._previousPage;
            } else {
              firstOffset = this._dataAttrDisabled;
            }
            // template
            tpl = string.substitute(this._itemTemplate, {
              className: firstClass,
              title: i18n.pagination.previousTitle,
              page: firstOffset,
              text: "<span " + this._dataAttr + "=\"" + firstOffset + "\" aria-hidden=\"true\" class=\"" + this.css.glyphicon + " " + this.css.left + "\"></span>",
            });
            this._startHTML += tpl;
          }
          // always show first and last pages
          if (this.showFirstLast) {
            // pagination first page
            if (this._currentIndex > (this.pagesPerSide + 1)) {
              // template
              tpl = string.substitute(this._itemTemplate, {
                className: this.css.hiddenXS,
                title: this._i18n.pagination.firstTitle,
                page: this._firstPage,
                text: number.format(this._firstPage) + this._helipText
              });
              this._startHTML += tpl;
            } else {
              this._middleCount = this._middleCount - 1;
            }
            // pagination last page
            if (this._currentIndex < (this.totalPages - this.pagesPerSide)) {
              tpl = string.substitute(this._itemTemplate, {
                className: this.css.hiddenXS,
                title: this._i18n.pagination.lastTitle + " (" + number.format(this.totalPages) + ")",
                page: this.totalPages,
                text: this._helipText + number.format(this.totalPages)
              });
              this._endHTML += tpl;
            } else {
              this._middleCount = this._middleCount - 1;
            }
          }
          // pagination next
          if (this.showPreviousNext) {
            var lastClass = this.css.disabled,
              lastOffset = "";
            if (this._currentIndex < this.totalPages) {
              lastClass = "";
              lastOffset = this._nextPage;
            } else {
              lastOffset = this._dataAttrDisabled;
            }
            tpl = string.substitute(this._itemTemplate, {
              className: lastClass,
              title: i18n.pagination.nextTitle,
              page: lastOffset,
              text: "<span " + this._dataAttr + "=\"" + lastOffset + "\" aria-hidden=\"true\" class=\"" + this.css.glyphicon + " " + this.css.right + "\"></span>"
            });
            this._endHTML += tpl;
          }
          // create each pagination item
          for (var i = 1; i <= this.totalPages; i++) {
            if (i <= (this._currentIndex + this.pagesPerSide) && i >= (this._currentIndex - this.pagesPerSide)) {
              if (this._firstMiddle === 0) {
                this._firstMiddle = i;
              }
              this._middleHTML += this._createMiddleItem({
                index: i,
                currentIndex: this._currentIndex
              });
              this._middleCount++;
              this._lastMiddle = i;
            }
          }
          // if last middle is last page
          if (this._lastMiddle === this.totalPages) {
            // get remainderStart start
            this._remainderStart = this._firstMiddle - 1;
            // while not enough remainders
            while (this._middleCount < this._totalMiddlePages) {
              // if remainder start is less or equal to first page
              if (this._remainderStart <= this._firstPage) {
                // end while
                break;
              }
              // add item to beginning of middle html
              this._middleHTML = this._createMiddleItem({
                index: this._remainderStart,
                currentIndex: this._currentIndex
              }) + this._middleHTML;
              // increase middle count
              this._middleCount++;
              // decrease remainder start
              this._remainderStart--;
            }
          }
          // if first middle is first page
          else if (this._firstMiddle === this._firstPage) {
            // get remainderStart start
            this._remainderStart = this._lastMiddle + 1;
            // while not enough remainders
            while (this._middleCount < this._totalMiddlePages) {
              // if remainder start is greater or equal to last page
              if (this._remainderStart >= this.totalPages) {
                // end while
                break;
              }
              // add item to end of middle html
              this._middleHTML += this._createMiddleItem({
                index: this._remainderStart,
                currentIndex: this._currentIndex
              });
              // increase middle count
              this._middleCount++;
              // increase remainder start
              this._remainderStart++;
            }
          }
          // add up HTML
          this._html += this._startHTML + this._middleHTML + this._endHTML;
        }
        // insert into html
        this.listNode.innerHTML = this._html;
        // not disabled anymore
        this.set("disabled", false);
        // get offset number
        var selectedPage = this.page;
        var selectedResultStart = (selectedPage - 1) * this.num;
        var selectedResultEnd = selectedResultStart + this.num;
        if (this.total) {
          this.infoNode.innerHTML = i18n.pagination.page + " " + number.format(this.page) + " of " + number.format(this.totalPages);
          // event
          this.emit("page", {
            selectedPage: selectedPage,
            selectedResultStart: selectedResultStart,
            selectedResultEnd: selectedResultEnd
          });
        }
      },

      /* ---------------- */
      /* Private Functions */
      /* ---------------- */

      _createMiddleItem: function (e) {
        // class
        var listClass = "";
        var dataPage = e.index;
        if (e.index === e.currentIndex) {
          // if selected
          listClass = this.css.active;
          dataPage = this._dataAttrDisabled;
        }
        return string.substitute(this._itemTemplate, {
          className: listClass + " " + this.css.hiddenXS,
          title: number.format(e.index),
          page: dataPage,
          text: number.format(e.index)
        });
      },

      _setTotalAttr: function (newVal) {
        this.total = newVal;
        if (this._created) {
          this.render();
        }
      },

      _setNumAttr: function (newVal) {
        this.num = newVal;
        if (this._created) {
          this.render();
        }
      },

      _setPageAttr: function (newVal) {
        this.page = newVal;
        if (this._created) {
          this.render();
        }
      },

      _setPagesPerSideAttr: function (newVal) {
        this.pagesPerSide = newVal;
        if (this._created) {
          this.render();
        }
      },

      _setShowPreviousNextAttr: function (newVal) {
        this.showPreviousNext = newVal;
        if (this._created) {
          this.render();
        }
      },

      _setThemeAttr: function (newVal) {
        if (this._created) {
          domClass.remove(this.domNode, this.theme);
          domClass.add(this.domNode, newVal);
        }
        this.theme = newVal;
      },

      _setShowFirstLastAttr: function (newVal) {
        this.showFirstLast = newVal;
        if (this._created) {
          this.render();
        }
      }

    });
    return Pagination;
  });