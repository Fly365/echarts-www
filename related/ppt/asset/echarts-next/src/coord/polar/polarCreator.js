// TODO Axis scale
define(function (require) {

    var Polar = require('./Polar');
    var IntervalScale = require('../../scale/Interval');
    var OrdinalScale = require('../../scale/Ordinal');
    var numberUtil = require('../../util/number');
    var zrUtil = require('zrender/core/util');

    var scaleClasses = require('../../scale/scale');

    var CATEGORY_AXIS_TYPE = 'category';
    var VALUE_AXIS_TYPE = 'value';

    // 依赖 PolarModel 做预处理
    require('./PolarModel');

    /**
     * Resize method bound to the polar
     * @param {module:echarts/coord/polar/PolarModel} polarModel
     * @param {module:echarts/ExtensionAPI} api
     */
    function resizePolar(polarModel, api) {
        var center = polarModel.get('center');
        var radius = polarModel.get('radius');
        var width = api.getWidth();
        var height = api.getHeight();
        var parsePercent = numberUtil.parsePercent;

        this.cx = parsePercent(center[0], width);
        this.cy = parsePercent(center[1], height);

        var radiusAxis = this.getRadiusAxis();
        var size = Math.min(width, height) / 2;
        radiusAxis.setExtent(
            parsePercent(radius[0], size),
            parsePercent(radius[1], size)
        );
    }

    /**
     * @param {module:echarts/coord/cartesian/AxisModel} axisModel
     * @return {module:echarts/scale/*}
     * @inner
     */
    function createScaleByModel(axisModel) {
        var axisType = axisModel.get('type');
        if (axisType) {
            switch (axisType) {
                // Buildin scale
                case CATEGORY_AXIS_TYPE:
                    return new OrdinalScale(axisModel.get('data'), [Infinity, -Infinity]);
                case VALUE_AXIS_TYPE:
                    return new IntervalScale();
                // Extended scale, like time and log
                default:
                    return (scaleClasses.getClass(axisType) || IntervalScale).create(axisModel);
            }
        }
    }

    /**
     * Set common axis properties
     * @param {module:echarts/coord/polar/AngleAxis|module:echarts/coord/polar/RadiusAxis}
     * @param {module:echarts/coord/polar/AxisModel}
     * @inner
     */
    function setAxis(axis, axisModel) {
        axis.type = axisModel.get('type');
        axis.scale = createScaleByModel(axisModel);
        axis.onBand = axisModel.get('boundaryGap') && axis.type === CATEGORY_AXIS_TYPE;
        axis.inverse = axisModel.get('inverse');

        // Inject axis instance
        axisModel.axis = axis;
    }

    /**
     * Set polar axis scale from series data
     */
    function setPolarAxisFromSeries(polarList, ecModel, api) {
        ecModel.eachSeries(function (seriesModel) {
            if (seriesModel.get('coordinateSystem') === 'polar') {
                var polarIndex = seriesModel.get('polarIndex') || 0;

                var polar = polarList[polarIndex];
                if (!polar) {
                    // api.log('Polar configuration not exist for series ' + seriesModel.name + '.');
                    return;
                }
                // Inject polar instance
                seriesModel.coordinateSystem = polar;

                var radiusAxis = polar.getRadiusAxis();
                var angleAxis = polar.getAngleAxis();

                var data = seriesModel.getData();
                radiusAxis.scale.unionExtent(
                    data.getDataExtent('radius', radiusAxis.type !== CATEGORY_AXIS_TYPE)
                );
                angleAxis.scale.unionExtent(
                    data.getDataExtent('angle', angleAxis.type !== CATEGORY_AXIS_TYPE)
                );
            }
        });

        zrUtil.each(polarList, function (polar) {
            // PENDING
            polar.getAngleAxis().scale.niceExtent(12);
            polar.getRadiusAxis().scale.niceExtent(5);
        });
    }

    var polarCreator = {

        create: function (ecModel, api) {
            var polarList = [];
            ecModel.eachComponent('polar', function (polarModel, idx) {
                var polar = new Polar(idx);
                // Inject resize method
                polar.resize = resizePolar;

                var radiusAxis = polar.getRadiusAxis();
                var angleAxis = polar.getAngleAxis();

                var radiusAxisModel = polarModel.findAxisModel('radiusAxis');
                var angleAxisModel = polarModel.findAxisModel('angleAxis');

                setAxis(radiusAxis, radiusAxisModel);
                setAxis(angleAxis, angleAxisModel);

                polar.resize(polarModel, api);
                polarList.push(polar);

                polarModel.coordinateSystem = polar;
            });

            setPolarAxisFromSeries(polarList, ecModel, api);

            // Fix extent of category angle axis
            zrUtil.each(polarList, function (polar) {
                var angleAxis = polar.getAngleAxis();
                if (angleAxis.type === CATEGORY_AXIS_TYPE && !angleAxis.onBand) {
                    var angle = 360 - 360 / (angleAxis.scale.count() + 1);
                    angleAxis.setExtent(0, angle);
                }
            });

            return polarList;
        }
    };

    require('../../CoordinateSystem').register('polar', polarCreator);
});