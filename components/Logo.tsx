import Link from 'next/link'

export default function Logo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 'text-lg', md: 'text-2xl', lg: 'text-4xl' }
  return (
    <Link href="/" className={`font-medium tracking-tight ${sizes[size]}`}>
      <span style={{ color: '#185FA5' }}>pace</span>
      <span className="text-gray-900">pact</span>
    </Link>
  )
}
