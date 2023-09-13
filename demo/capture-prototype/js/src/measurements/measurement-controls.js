/**
 * Measurement controls
 * @class
 */
const MeasurementControls = function () {
    Controls.call(this, 'measurements');
    
    // Static controls
    this.controls = {
        exportTo2d: {
            id: 'measurement-to-2d',
            type: 'button'
        }
    }
}