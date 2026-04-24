import Link from 'next/link'
import Image from 'next/image'

export default function Logo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 'text-lg', md: 'text-2xl', lg: 'text-4xl' }
  const imgSizes = { sm: 20, md: 26, lg: 40 }
  return (
    <Link href="/" className={`flex items-center gap-2 font-medium tracking-tight ${sizes[size]}`}>
      <Image
        src="/pacepact-logo.svg"
        alt="PacePact logo"
        width={imgSizes[size]}
        height={imgSizes[size]}
      />
      <span style={{ color: '#185FA5' }}>pace</span>
      <span className="text-gray-900">pact</span>
    </Link>
  )
}
