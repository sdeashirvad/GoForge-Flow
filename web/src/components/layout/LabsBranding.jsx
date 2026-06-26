export function LabsBranding({ compact = false }) {
  return (
    <div className={compact ? 'text-center' : 'space-y-2'}>
      <p className="text-xs text-muted-foreground leading-relaxed">
        An independent product by{' '}
        <a
          href="https://labs.sdeashirvad.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-foreground/80 hover:text-primary underline-offset-2 hover:underline transition-colors"
        >
          SDEAshirvad Labs
        </a>
      </p>
      {!compact && (
        <p className="text-xs text-muted-foreground/70">
          Created by{' '}
          <a
            href="https://sdeashirvad.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors"
          >
            Ashirvad
          </a>
        </p>
      )}
    </div>
  )
}
