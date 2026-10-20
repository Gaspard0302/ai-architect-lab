import Link from 'next/link'
import type { ComponentProps, ReactNode } from 'react'
import styles from './Button.module.css'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost'
export type ButtonSize = 'sm' | 'md' | 'lg'

type Shared = {
  variant?: ButtonVariant
  size?: ButtonSize
  /** Fill the container's width. */
  block?: boolean
  children: ReactNode
  className?: string
}

export type ButtonProps = Shared & Omit<ComponentProps<'button'>, keyof Shared>
export type ButtonLinkProps = Shared & Omit<ComponentProps<typeof Link>, keyof Shared>

const cx = (variant: ButtonVariant, size: ButtonSize, block?: boolean, extra?: string) =>
  [
    styles.base,
    styles[variant],
    size !== 'md' ? styles[size] : '',
    block ? styles.block : '',
    extra ?? '',
  ]
    .filter(Boolean)
    .join(' ')

export function Button({
  variant = 'secondary',
  size = 'md',
  block,
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button className={cx(variant, size, block, className)} {...rest}>
      {children}
    </button>
  )
}

/** Same skin, rendered as a link. Use for navigation, never for submitting. */
export function ButtonLink({
  variant = 'secondary',
  size = 'md',
  block,
  className,
  children,
  ...rest
}: ButtonLinkProps) {
  return (
    <Link className={cx(variant, size, block, className)} {...rest}>
      {children}
    </Link>
  )
}
