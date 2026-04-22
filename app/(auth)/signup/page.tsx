import { Suspense } from 'react'
import SignupClient from './SignupClient'

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="w-full max-w-sm" />}>
      <SignupClient />
    </Suspense>
  )
}
