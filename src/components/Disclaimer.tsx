import styles from './Disclaimer.module.css'

interface DisclaimerProps {
  onAcknowledge: () => void
  remainingCount: number
}

export function Disclaimer({ onAcknowledge }: DisclaimerProps) {
  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <div className={styles.icon}>⚠️</div>
          <h2 className={styles.title}>Important Notice</h2>
        </div>

        <div className={styles.content}>
          <p className={styles.text}>
            This app is a <strong>proof of concept</strong>. It contains bugs,
            limitations, and requires you to be able to configure an external
            tool called <strong>Beeper Desktop</strong>.
          </p>

          <div className={styles.highlight}>
            <p>
              Please ensure you have Beeper Desktop installed and running with
              Developer Mode enabled before proceeding.
            </p>
          </div>
        </div>

        <div className={styles.footer}>
          <button
            className={styles.acknowledgeButton}
            onClick={onAcknowledge}
          >
            I Acknowledge
          </button>
          
        </div>
      </div>
    </div>
  )
}
