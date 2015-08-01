/**
 * API doc.
 */
define(function (require) {

    var $ = require('jquery');
    var Component = require('dt/ui/Component');
    var schemaHelper = require('../common/schemaHelper');
    var helper = require('./helper');
    var dtLib = require('dt/lib');
    var docUtil = require('../common/docUtil');
    var lang = require('./lang');
    var markRender = require('./markrender');
    var feedback = require('../common/feedback');

    require('dt/componentConfig');

    var SCHEMA_URL = '../docv/data/schema/optionSchema.json';
    var CATEGORY_URL = '../docv/data/api/index.json';
    var TPL_TARGET = 'APIMain';
    var SELECTOR_TYPE = '.ecdoc-api-type';
    var SELECTOR_DESC = '.ecdoc-api-desc';
    var SELECTOR_DESC_AREA = '.ecdoc-api-desc-area';
    var SELECTOR_DEFAULT = '.ecdoc-api-default';
    var SELECTOR_OPTION_PATH = '.ecdoc-api-option-path';
    var SELECTOR_COLLAPSE_RADIO = '.query-collapse-radio input[type=radio]';
    var SELECTOR_QUERY_RESULT_INFO = '.query-result-info';
    var SELECTOR_CHART_CLOSE_BUTTON = '.api-chart-close-btn';
    var SELECTOR_CHART_AREA = '.ecdoc-api-chart-query-area';
    var CSS_CHART_AREA_CLOSE = 'ecdoc-api-chart-query-area-close';
    var CSS_DESC_AREA_FULL = 'ecdoc-api-desc-area-full';
    var CSS_CLOSE_BUTTON = 'glyphicon glyphicon-resize-small';
    var CSS_OPEN_BUTTON = 'glyphicon glyphicon-resize-full';

    /**
     * @public
     * @type {Object}
     */
    var api = {};

    /**
     * @type {Object}
     */
    var apiMai;

    /**
     * @public
     */
    api.init = function () {
        apiMai = new APIMain($('.ecdoc-apidoc'));

        feedback.init('option');
    };

    /**
     * @class
     * @extends dt/ui/Component
     */
    var APIMain = Component.extend({

        _define: {
            tpl: require('tpl!./api.tpl.html'),
            css: 'ecdoc-apidoc',
            viewModel: function () {
                return {
                    apiTreeDatasource: [],
                    apiTreeSelected: dtLib.ob(),
                    apiTreeHighlighted: dtLib.obArray(),
                    apiTreeHovered: dtLib.ob()
                };
            }
        },

        getLang: function () {
            return lang;
        },

        _prepare: function () {
            $.when(
                $.getJSON(docUtil.addVersionArg(SCHEMA_URL)),
                $.getJSON(docUtil.addVersionArg(CATEGORY_URL))
            ).done($.proxy(onLoaded, this));

            function onLoaded(schema, catagory) {
                // Before render page
                this._initMark(catagory[0]);
                this._prepareDoc(schema[0]);

                // Render page
                this._applyTpl(this.$el(), TPL_TARGET);

                // After render page
                this._initCategory();
                this._initDoc();
                this._initResize();

                // The last steps.
                this._initHash();
                this._initCategoryHash();
            }
        },

        _prepareDoc: function (schema) {
            var renderBase = {};

            this._schemaStatistic = schemaHelper.statisticSchema(schema);

            schemaHelper.buildDoc(schema, renderBase, this._schemaStatistic.universal);

            this._docTree = {
                value: 'root',
                text: 'var echartsOption = ',
                childrenPre: '{',
                childrenPost: '}',
                childrenBrief: ' ... ',
                children: renderBase.children[0].children,
                expanded: true
            };

            this._viewModel().apiTreeDatasource = [this._docTree];
        },

        _initDoc: function () {
            this._initTree();
            this._initQueryBox();
        },

        _initTree: function () {
            var viewModel = this._viewModel();
            this._disposable(viewModel.apiTreeHovered.subscribe(
                $.proxy(handleChange, this, false)
            ));
            this._disposable(viewModel.apiTreeSelected.subscribe(
                $.proxy(handleChange, this, true)
            ));

            function handleChange(persistent, nextValue, ob) {
                var treeItem = ob.getTreeDataItem(true);

                this._updateDesc(persistent, nextValue, treeItem);

                // 更新hash
                if (persistent && treeItem.optionPathForHash) {
                    helper.hashRoute({queryString: treeItem.optionPathForHash});
                }
            }
        },

        _initHash: function () {
            var that = this;
            helper.initHash(parseHash);

            function parseHash(newHash) {
                if (newHash) {
                    var hashInfo = helper.parseHash(newHash);

                    if (hashInfo.queryString) {
                        that._handleHashQuery(hashInfo.queryString);
                    }
                    if (hashInfo.category) {
                        markRender.go(-1, hashInfo.category);
                    }
                }
            }
        },

        _initQueryBox: function () {
            var queryInput = this._sub('queryInput');
            var queryMode = this._sub('queryMode');
            var queryValueOb = queryInput.viewModel('value');
            queryValueOb.subscribe(queryBoxGo, this);
            var checked = queryMode.viewModel('checked');

            checked.subscribe(onModeChanged, this);
            onModeChanged.call(this, checked());

            this._sub('collapseAll').on('click', $.proxy(collapseAll, this));

            $(document).keypress(function (e) {
                var tagName = (e.target.tagName || '').toLowerCase();
                if (e.which === 47 && tagName !== 'input' && tagName !== 'textarea') { // "/"键
                    queryInput.focus();
                    queryInput.select();
                    e.preventDefault();
                }
            });

            function onModeChanged(nextValue) {
                var dataItem = queryMode.getDataItem(nextValue);
                queryInput.viewModel('placeholder')(dataItem.placeholder);
                queryBoxGo.call(this);
            }

            function queryBoxGo() {
                var queryStr = queryValueOb();
                if (queryStr) {
                    this.doQuery(queryStr, checked(), false, true);
                }
            }

            function collapseAll() {
                this._setResultInfo(null);
                this._viewModel().apiTreeHighlighted([], {collapseLevel: 1});
            }
        },

        _updateDesc: function (persistent, nextValue, treeItem) {
            var $el = this.$el();
            if (treeItem) {
                var type = treeItem.type || '';
                if ($.isArray(type)) {
                    type = type.join(', ');
                }
                var desc = {
                    type: dtLib.encodeHTML(type),
                    descText: lang.langCode === 'en' // 不需要encodeHTML，本身就是html
                        ? (treeItem.descriptionEN || '')
                        : (treeItem.descriptionCN || ''),
                    defaultValueText: dtLib.encodeHTML(treeItem.defaultValueText),
                    optionPath: dtLib.encodeHTML(treeItem.optionPath || '')
                };

                if (persistent) {
                    this._desc = desc;
                }

                renderDesc(desc);
            }
            else if (this._desc) { // nothing hovered. restore
                renderDesc(this._desc);
            }

            function renderDesc(desc) {
                $el.find(SELECTOR_TYPE)[0].innerHTML = desc.type;
                $el.find(SELECTOR_DESC)[0].innerHTML = desc.descText;
                $el.find(SELECTOR_DEFAULT)[0].innerHTML = desc.defaultValueText;
                $el.find(SELECTOR_OPTION_PATH)[0].innerHTML = desc.optionPath;
            }
        },

        /**
         * @private
         */
        _handleHashQuery: function (queryString) {
            var dataItem = this._viewModel().apiTreeSelected.getTreeDataItem(true);
            if (!dataItem || queryString !== dataItem.optionPathForHash) {
                this.doQuery(queryString, 'optionPath', true);
            }
        },

        /**
         * Query doc tree and scroll to result.
         * QueryStr like 'series[i](applicable:pie,line).itemStyle.normal.borderColor'
         *
         * @public
         * @param {string} queryStr Query string.
         * @param {string} queryArgName Value can be 'optionPath', 'fuzzyPath', 'anyText'.
         * @param {boolean} selectFirst Whether to select first result, default: false.
         * @param {boolean} showResult
         */
        doQuery: function (queryStr, queryArgName, selectFirst, showResult) {
            var result;

            try {
                var args = {};
                args[queryArgName] = queryStr;
                result = schemaHelper.queryDocTree(
                    this._docTree, this._schemaStatistic.universal, args
                );
            }
            catch (e) {
                alert(e);
                return;
            }

            if (showResult) {
                this._setResultInfo(result.length);
            }

            var collapseLevel = null;
            $(SELECTOR_COLLAPSE_RADIO).each(function () {
                if (this.checked && this.value === '1') {
                    collapseLevel = 2;
                }
            });

            if (!result.length) {
                return;
            }

            var valueSet = [];
            for (var i = 0, len = result.length; i < len; i++) {
                valueSet.push(result[i].value);
            }

            var viewModel = this._viewModel();
            if (selectFirst) {
                viewModel.apiTreeHighlighted(
                    valueSet,
                    {scrollToTarget: false, collapseLevel: collapseLevel, always: next}
                );
            }
            else { // Only highlight
                viewModel.apiTreeHighlighted(
                    valueSet,
                    {scrollToTarget: {clientX: 180}, collapseLevel: collapseLevel}
                );
            }

            function next() {
                viewModel.apiTreeSelected(
                    result[0].value,
                    {scrollToTarget: {clientX: 180}, collapseLevel: collapseLevel}
                );
            }
        },

        /**
         * @private
         * @param {number=} count null means clear.
         */
        _setResultInfo: function (count) {
            var text = count == null
                ? ''
                : (count === 0
                    ? lang.queryBoxNoResult
                    : dtLib.strTemplate(
                        lang.queryResultInfo, {count: count}
                    )
                );
            this.$el().find(SELECTOR_QUERY_RESULT_INFO)[0].innerHTML = text;
        },

        _initMark: function(category) {
            markRender.init(category);
        },

        _initCategory: function() {
            markRender.initCategory($(SELECTOR_CHART_AREA));
        },

        _initCategoryHash: function() {
            markRender.initCategoryHash();
        },

        _initResize: function () {
            var $chartCloseBtn = $(SELECTOR_CHART_CLOSE_BUTTON);
            var $chartArea = $(SELECTOR_CHART_AREA);
            var $descArea = $(SELECTOR_DESC_AREA);
            $chartCloseBtn
                .addClass(CSS_CLOSE_BUTTON)
                .on('click', onClick);

            function onClick() {
                $chartArea.toggleClass(CSS_CHART_AREA_CLOSE);
                $descArea.toggleClass(CSS_DESC_AREA_FULL);
                $chartCloseBtn.toggleClass(CSS_CLOSE_BUTTON).toggleClass(CSS_OPEN_BUTTON);
            }
        }
    });

    return api;
});
