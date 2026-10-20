'use client'

import { useActionState, useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components'
import { signIn, signUp } from './actions'
import { idleAuth, MAX_NAME_LENGTH } from './auth'
import styles from './SignIn.module.css'

export type Person = { id: string; name: string }

type Step = { kind: 'pick' } | { kind: 'pin'; person: Person } | { kind: 'new' }

const digitsOnly = (v: string) => v.replace(/\D/g, '').slice(0, 4)

export function SignIn({ people }: { people: Person[] }) {
  const [step, setStep] = useState<Step>({ kind: 'pick' })

  return (
    <div className={styles.panel}>
      {step.kind === 'pick' && (
        <PickName
          people={people}
          onPick={(person) => setStep({ kind: 'pin', person })}
          onNew={() => setStep({ kind: 'new' })}
        />
      )}
      {step.kind === 'pin' && (
        <PinForm person={step.person} onBack={() => setStep({ kind: 'pick' })} />
      )}
      {step.kind === 'new' && <NewUserForm onBack={() => setStep({ kind: 'pick' })} />}
    </div>
  )
}

/* ------------------------------------------------------------------ step 1: the name */

function PickName({
  people,
  onPick,
  onNew,
}: {
  people: Person[]
  onPick: (p: Person) => void
  onNew: () => void
}) {
  const [query, setQuery] = useState('')

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? people.filter((p) => p.name.toLowerCase().includes(q)) : people
  }, [people, query])

  return (
    <>
      <h2 className={styles.heading}>Who is studying?</h2>

      {people.length > 0 && (
        <>
          <label className={styles.field}>
            <span className={styles.label}>Find your name</span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Start typing…"
              autoComplete="off"
              className={styles.input}
            />
          </label>

          {matches.length > 0 ? (
            <ul className={styles.names}>
              {matches.map((p) => (
                <li key={p.id}>
                  <button type="button" className={styles.name} onClick={() => onPick(p)}>
                    {p.name}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.none}>
              No name matches “{query.trim()}”. Sign up below and it will be here next time.
            </p>
          )}
        </>
      )}

      {people.length === 0 && (
        <p className={styles.none}>Nobody has signed up yet. Be the first.</p>
      )}

      <div className={styles.footer}>
        <Button type="button" variant="primary" onClick={onNew}>
          I&rsquo;m new
        </Button>
      </div>
    </>
  )
}

/* -------------------------------------------------------------------- step 2: the PIN */

function PinForm({ person, onBack }: { person: Person; onBack: () => void }) {
  const [state, action, pending] = useActionState(signIn, idleAuth)
  const [pin, setPin] = useState('')
  const formRef = useRef<HTMLFormElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Every reply carries a fresh `at`, so two identical errors in a row still clear the
  // field and put the cursor back where the next attempt starts.
  useEffect(() => {
    if (state.at) {
      setPin('')
      inputRef.current?.focus()
    }
  }, [state.at])

  return (
    <form ref={formRef} action={action}>
      <input type="hidden" name="userId" value={person.id} />

      <h2 className={styles.heading}>
        Hello, <em>{person.name}</em>
      </h2>

      <label className={styles.field}>
        <span className={styles.label}>Your 4-digit PIN</span>
        <input
          ref={inputRef}
          name="pin"
          value={pin}
          onChange={(e) => {
            const next = digitsOnly(e.target.value)
            setPin(next)
            if (next.length === 4) formRef.current?.requestSubmit()
          }}
          type="password"
          inputMode="numeric"
          autoComplete="off"
          autoFocus
          disabled={pending}
          aria-invalid={state.error ? true : undefined}
          aria-describedby={state.error ? 'pin-error' : undefined}
          className={`${styles.input} ${styles.pin}`}
        />
      </label>

      {state.error && (
        <p id="pin-error" role="alert" className={styles.error}>
          {state.error}
        </p>
      )}

      <div className={styles.footer}>
        <button type="button" className={styles.back} onClick={onBack}>
          Not {person.name}?
        </button>
        <Button type="submit" variant="primary" disabled={pending || pin.length !== 4}>
          {pending ? 'Checking…' : 'Sign in'}
        </Button>
      </div>
    </form>
  )
}

/* ------------------------------------------------------------------ step 2b: brand new */

function NewUserForm({ onBack }: { onBack: () => void }) {
  const [state, action, pending] = useActionState(signUp, idleAuth)
  const [name, setName] = useState('')
  const [pin, setPin] = useState('')
  const [confirm, setConfirm] = useState('')
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state.at) {
      setPin('')
      setConfirm('')
    }
  }, [state.at])

  const ready = name.trim().length > 0 && pin.length === 4 && confirm.length === 4

  return (
    <form ref={formRef} action={action}>
      <h2 className={styles.heading}>
        Make yourself a <em>name</em>
      </h2>
      <p className={styles.hint}>
        The PIN keeps your progress yours. It is not a password — pick four digits you will
        not forget.
      </p>

      <label className={styles.field}>
        <span className={styles.label}>Name</span>
        <input
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={MAX_NAME_LENGTH}
          autoComplete="off"
          autoFocus
          disabled={pending}
          className={styles.input}
        />
      </label>

      <div className={styles.pair}>
        <label className={styles.field}>
          <span className={styles.label}>PIN</span>
          <input
            name="pin"
            value={pin}
            onChange={(e) => setPin(digitsOnly(e.target.value))}
            type="password"
            inputMode="numeric"
            autoComplete="off"
            disabled={pending}
            className={`${styles.input} ${styles.pin}`}
          />
        </label>

        <label className={styles.field}>
          <span className={styles.label}>Confirm</span>
          <input
            name="confirm"
            value={confirm}
            onChange={(e) => {
              const next = digitsOnly(e.target.value)
              setConfirm(next)
              if (next.length === 4 && pin.length === 4 && name.trim()) {
                formRef.current?.requestSubmit()
              }
            }}
            type="password"
            inputMode="numeric"
            autoComplete="off"
            disabled={pending}
            className={`${styles.input} ${styles.pin}`}
          />
        </label>
      </div>

      {state.error && (
        <p role="alert" className={styles.error}>
          {state.error}
        </p>
      )}

      <div className={styles.footer}>
        <button type="button" className={styles.back} onClick={onBack}>
          I already have a name
        </button>
        <Button type="submit" variant="primary" disabled={pending || !ready}>
          {pending ? 'Creating…' : 'Start'}
        </Button>
      </div>
    </form>
  )
}
