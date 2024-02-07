namespace servers {
    export class AccelerometerServer extends jacdac.SensorServer {
        private lastEvent: number = -1
        constructor() {
            super(jacdac.SRV_ACCELEROMETER)
        }

        start() {
            super.start()
            input.onGesture(Gesture.Shake, function () {
                this.sendEvent(jacdac.AccelerometerEvent.Shake)
            })
            input.onGesture(Gesture.ScreenUp, function () {
                this.sendEvent(jacdac.AccelerometerEvent.FaceUp)
            })
            input.onGesture(Gesture.ScreenDown, function () {
                this.sendEvent(jacdac.AccelerometerEvent.FaceDown)
            })
            input.onGesture(Gesture.LogoUp, function () {
                this.sendEvent(jacdac.AccelerometerEvent.TiltUp)
            })
            input.onGesture(Gesture.LogoDown, function () {
                this.sendEvent(jacdac.AccelerometerEvent.TiltDown)
            })
            input.onGesture(Gesture.TiltLeft, function () {
                this.sendEvent(jacdac.AccelerometerEvent.TiltLeft)
            })
            input.onGesture(Gesture.TiltRight, function () {
                this.sendEvent(jacdac.AccelerometerEvent.TiltRight)
            })
            input.onGesture(Gesture.FreeFall, function () {
                this.sendEvent(jacdac.AccelerometerEvent.Freefall)
            })
        }

        public serializeState(): Buffer {
            let ax = -input.acceleration(Dimension.X) / 1000
            let ay = input.acceleration(Dimension.Y) / 1000
            let az = input.acceleration(Dimension.Z) / 1000
            return jacdac.jdpack(jacdac.AccelerometerRegPack.Forces, [ax, ay, az])
        }
    }

    //% fixedInstance whenUsed block="accelerometer"
    export const accelerometerServer = new AccelerometerServer()


    export class SoundLevelServer extends jacdac.SensorServer {
        enabled: boolean = false
        private registered = false
        // Sensitivity	-38dB ±3dB @ 94dB SPL
        minDecibels: number = 56
        maxDecibels: number = 132
        loudThreshold: number = 0.5
        quietThreshold: number = 0.2

        constructor() {
            super(jacdac.SRV_SOUND_LEVEL)
        }
        private setThresholds() {
            input.setSoundThreshold(
                SoundThreshold.Loud,
                255 * this.loudThreshold
            )
            input.setSoundThreshold(
                SoundThreshold.Quiet,
                255 * this.quietThreshold
            )
        }

        public handlePacket(pkt: jacdac.JDPacket) {
            const oldEnabled = this.enabled
            this.enabled = this.handleRegBool(
                pkt,
                jacdac.SoundLevelReg.Enabled,
                this.enabled
            )
            this.loudThreshold = this.handleRegValue(
                pkt,
                jacdac.SoundLevelReg.LoudThreshold,
                jacdac.SoundLevelRegPack.LoudThreshold,
                this.loudThreshold
            )
            this.quietThreshold = this.handleRegValue(
                pkt,
                jacdac.SoundLevelReg.QuietThreshold,
                jacdac.SoundLevelRegPack.QuietThreshold,
                this.quietThreshold
            )
            super.handlePacket(pkt)

            if (this.enabled && oldEnabled !== this.enabled)
                this.registerEvents()
            if (this.enabled) this.setThresholds()
            pkt.possiblyNotImplemented()
        }

        private registerEvents() {
            if (this.enabled) {
                this.registered = true
                input.onSound(DetectedSound.Loud, function () {
                    this.sendEvent(jacdac.SoundLevelEvent.Loud)
                })
                input.onSound(DetectedSound.Quiet, function () {
                    this.sendEvent(jacdac.SoundLevelEvent.Quiet)
                })
            } else if (this.registered) {
                input.onSound(DetectedSound.Loud, function () { })
                input.onSound(DetectedSound.Quiet, function () { })
                this.registered = false
            }
        }

        public serializeState(): Buffer {
            const soundLevel = this.enabled ? input.soundLevel() / 255.0 : 0.0
            return jacdac.jdpack(jacdac.SoundLevelRegPack.SoundLevel, [soundLevel])
        }
    }

    //% fixedInstance whenUsed block="sound level"
    export const soundLevelServer = new SoundLevelServer()

    // Den erweiterten Beschleunigungssensor- und Soundlevelserver starten
    // aber nur wenn wir nicht im Simulatormodus sind!

    if (!jacdac.isSimulator()) {
        servers.accelerometerServer.start()
        servers.soundLevelServer.start()
    }

}

namespace modules {

    /**
     * The acceleration measured onboard
     */
    //% fixedInstance whenUsed block="Onboard Acceleration"
    export const OnboardAccelerationClient = new AccelerometerClient("Onboard Acceleration?dev=self")

    /**
     * The Temperature measured onboard
     */
    //% fixedInstance whenUsed block="Onboard Temperature"
    export const OnboardTemperatureClient = new TemperatureClient("Onboard Temperature?dev=self&variant=indoor")

    /**
    * The lightlevel measured onboard
    */
    //% fixedInstance whenUsed block="Onboard Lightlevel"
    export const OnboardLightlevelClient = new LightLevelClient("Onboard Lightlevel?dev=self&variant=ReverseBiasedLED")

    /**
    * The magnetic field  measured onboard
    */
    //% fixedInstance whenUsed block="Onboard Magnetic field"
    export const OnboardMagnetigFieldClient = new MagneticFieldLevelClient("Onboard Magnetic field?dev=self&variant=AnalogS")

    /**
    * The soundlevel measured onboard
    */
    //% fixedInstance whenUsed block="Onboard Soundlevel"
    export const OnboardSoundlevelClient = new SoundLevelClient("Onboard Soundlevel?dev=self")

}


namespace servers {

    function start() {

        jacdac.productIdentifier = 0x3347a2d2 // Calliope mini
        jacdac.deviceDescription = "Onboard Sensors"
        jacdac.startSelfServers(() => {
            const servers = [
                jacdac.createSimpleSensorServer(
                    jacdac.SRV_TEMPERATURE,
                    jacdac.TemperatureRegPack.Temperature,
                    () => input.temperature(), {
                    statusCode: jacdac.SystemStatusCodes.Initializing
                }
                ),

                jacdac.createSimpleSensorServer(
                    jacdac.SRV_LIGHT_LEVEL,
                    jacdac.LightLevelRegPack.LightLevel,
                    () => input.lightLevel() / 255, {
                    statusCode: jacdac.SystemStatusCodes.Initializing
                }
                ),

                jacdac.createSimpleSensorServer(
                    jacdac.SRV_MAGNETIC_FIELD_LEVEL,
                    jacdac.MagneticFieldLevelRegPack.Strength,
                    () => input.magneticForce(Dimension.Z) / 255, {
                    statusCode: jacdac.SystemStatusCodes.Initializing
                }
                ),
            ]

            control.runInParallel(() => {
                pause(400)
                for (const server of servers)
                    server.setStatusCode(jacdac.SystemStatusCodes.Ready)
            })
            return servers
        })
    }

    modules.OnboardSoundlevelClient.setEnabled(true) //microfone on
    start()
}