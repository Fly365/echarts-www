define(function (require) {

    var zrUtil = require('zrender/core/util');
    var Axis = require('../Axis');

    /**
     * Extend axis 2d
     * @constructor module:echarts/coord/cartesian/Axis2D
     * @extends {module:echarts/coord/cartesian/Axis}
     * @param {string} dim
     * @param {*} scale
     * @param {Array.<number>} coordExtent
     * @param {string} axisType
     * @param {string} position
     */
    var Axis2D = function (dim, scale, coordExtent, axisType, position) {
        Axis.call(this, dim, scale, coordExtent);
        /**
         * Axis type
         *  - 'category'
         *  - 'value'
         *  - 'time'
         *  - 'log'
         * @type {string}
         */
        this.type = axisType || 'value';

        /**
         * Axis position
         *  - 'top'
         *  - 'bottom'
         *  - 'left'
         *  - 'right'
         */
        this.position = position || 'bottom';
    };

    Axis2D.prototype = {

        constructor: Axis2D,

        /**
         * If axis is on the zero position of the other axis
         * @type {boolean}
         */
        onZero: false,

        /**
         * Axis model
         * @param {module:echarts/coord/cartesian/AxisModel}
         */
        model: null,

        isHorizontal: function () {
            var position = this.position;
            return position === 'top' || position === 'bottom';
        }
    };
    zrUtil.inherits(Axis2D, Axis);

    return Axis2D;
});