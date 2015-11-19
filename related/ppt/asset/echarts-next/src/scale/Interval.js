/**
 * Interval scale
 * @module echarts/coord/scale/Interval
 */

define(function (require) {

    var numberUtil = require('../util/number');

    var mathFloor = Math.floor;
    var mathCeil = Math.ceil;
    /**
     * @alias module:echarts/coord/scale/Interval
     * @constructor
     */
    var IntervalScale = function () {

        /**
         * Extent
         * @type {Array.<number>}
         * @protected
         */
        this._extent = [Infinity, -Infinity];

        /**
         * Step is calculated in adjustExtent
         * @type {Array.<number>}
         * @protected
         */
        this._interval = 0;
    };

    IntervalScale.prototype = {

        constructor: IntervalScale,

        type: 'interval',

        /**
         * If scale extent contain give value
         * @param {number}
         */
        contain: function (val) {
            var extent = this._extent;
            return val >= extent[0] && val <= extent[1];
        },

        /**
         * Normalize value to linear [0, 1]
         * @param {number} val
         * @return {number}
         */
        normalize: function (val) {
            var extent = this._extent;
            return (val - extent[0]) / (extent[1] - extent[0]);
        },

        /**
         * Scale normalized value
         * @param {number} val
         * @return {number}
         */
        scale: function (val) {
            var extent = this._extent;
            return val * (extent[1] - extent[0]) + extent[0];
        },

        /**
         * Set extent from data
         * @param {Array.<number>} other
         */
        unionExtent: function (other) {
            var extent = this._extent;
            other[0] < extent[0] && (extent[0] = other[0]);
            other[1] > extent[1] && (extent[1] = other[1]);
        },

        /**
         * Get extent
         * @return {Array.<number>}
         */
        getExtent: function () {
            return this._extent.slice();
        },

        /**
         * Set extent
         * @param {number} start
         * @param {number} end
         */
        setExtent: function (start, end) {
            var thisExtent = this._extent;
            if (!isNaN(start)) {
                thisExtent[0] = start;
            }
            if (!isNaN(end)) {
                thisExtent[1] = end;
            }
            if (thisExtent[0] === thisExtent[1]) {
                // Expand extent
                var expandSize = thisExtent[0] / 2;
                thisExtent[0] -= expandSize;
                thisExtent[1] += expandSize;
            }
        },

        /**
         * Get interval
         */
        getInterval: function () {
            if (! this._interval) {
                this.niceTicks();
            }
            return this._interval;
        },

        /**
         * Set interval
         * @param {number} interval
         */
        setInterval: function (interval) {
            this._interval = interval;
        },

        /**
         * @return {Array.<number>}
         */
        getTicks: function () {
            var interval = this.getInterval();
            var extent = this._extent;
            var ticks = [];

            if (interval) {
                var niceExtent = this._niceExtent;
                if (extent[0] < niceExtent[0]) {
                    ticks.push(extent[0]);
                }
                var tick = niceExtent[0];
                while (tick <= niceExtent[1]) {
                    ticks.push(tick);
                    // Avoid rounding error
                    tick = numberUtil.round(tick + interval);
                }
                if (extent[1] > niceExtent[1]) {
                    ticks.push(extent[1]);
                }
            }

            return ticks;
        },

        /**
         * @return {Array.<string>}
         */
        getTicksLabels: function () {
            var labels = [];
            var ticks = this.getTicks();
            for (var i = 0; i < ticks.length; i++) {
                labels.push(this.getLabel(ticks[i]));
            }
            return labels;
        },

        /**
         * @param {number} n
         * @return {number}
         */
        // FIXME addCommas
        getLabel: function (data) {
            return data + '';
        },

        /**
         * Update interval and extent of intervals for nice ticks
         * Algorithm from d3.js
         * @param  {number} [approxTickNum = 10] Given approx tick number
         */
        niceTicks: function (approxTickNum) {
            approxTickNum = approxTickNum || 10;
            var extent = this._extent;
            var span = extent[1] - extent[0];
            if (span === Infinity || span <= 0) {
                return;
            }

            // Figure out step quantity, for example 0.1, 1, 10, 100
            var interval = Math.pow(10, Math.floor(Math.log(span / approxTickNum) / Math.LN10));
            var err = approxTickNum / span * interval;

            // Filter ticks to get closer to the desired count.
            if (err <= 0.15) {
                interval *= 10;
            }
            else if (err <= 0.3) {
                interval *= 5;
            }
            else if (err <= 0.5) {
                interval *= 3;
            }
            else if (err <= 0.75) {
                interval *= 2;
            }

            var niceExtent = [
                mathCeil(extent[0] / interval) * interval,
                mathFloor(extent[1] / interval) * interval
            ];

            this._interval = interval;
            this._niceExtent = niceExtent;
        },

        /**
         * Nice extent.
         * @param {number} [approxTickNum = 10] Given approx tick number
         * @param {boolean} [fixMin=false]
         * @param {boolean} [fixMax=false]
         */
        niceExtent: function (approxTickNum, fixMin, fixMax) {
            this.niceTicks(approxTickNum);

            var extent = this._extent;
            var interval = this._interval;

            if (!fixMin) {
                extent[0] = numberUtil.round(mathFloor(extent[0] / interval) * interval);
            }
            if (!fixMax) {
                extent[1] = numberUtil.round(mathCeil(extent[1] / interval) * interval);
            }
        }
    };

    /**
     * @return {module:echarts/scale/Time}
     */
    IntervalScale.create = function () {
        return new IntervalScale();
    };

    require('./scale').register(IntervalScale);

    return IntervalScale;
});