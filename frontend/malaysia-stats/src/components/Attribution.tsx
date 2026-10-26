type Link = { href: string; label: string }

type Props = {
  extra?: Link[]
}

export function Attribution({ extra = [] }: Props) {
  return (
    <footer className="attribution">
      Data from{' '}
      <a
        href="https://open.dosm.gov.my/data-catalogue/population_malaysia"
        target="_blank"
        rel="noreferrer"
      >
        OpenDOSM — Population Table: Malaysia
      </a>
      {extra.map((link) => (
        <span key={link.href}>
          {' '}
          and{' '}
          <a href={link.href} target="_blank" rel="noreferrer">
            {link.label}
          </a>
        </span>
      ))}
      , Department of Statistics Malaysia. Licensed under{' '}
      <a
        href="https://creativecommons.org/licenses/by/4.0/"
        target="_blank"
        rel="noreferrer"
      >
        CC BY 4.0
      </a>
      .
    </footer>
  )
}
