'use client'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import Dither from '@/components/Dither'
import { ArrowRight, Zap, Shield, Globe, Wallet } from 'lucide-react'

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-black text-white overflow-x-hidden">
      {/* Hero Section - Full Height Dither */}
      <div className="relative h-screen w-full">
        <Dither
          waveColor={[0.5, 0.5, 0.5]}
          disableAnimation={false}
          enableMouseInteraction
          mouseRadius={0.3}
          colorNum={4}
          waveAmplitude={0.3}
          waveFrequency={3}
          waveSpeed={0.05}
        />
        
        {/* Overlay Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center px-4 z-10">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 backdrop-blur-sm mb-8">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-xs font-medium text-white/70 tracking-widest uppercase">
                Powered by ENS & Circle CCTP
              </span>
            </div>
            
            <h1 className="text-6xl md:text-8xl lg:text-[10rem] font-black mb-4 tracking-tighter leading-[0.9]">
              <span className="text-white">
                Your ENS.
              </span>
              <br />
              <span className="text-[#a3e635]">
                Your Rules.
              </span>
            </h1>
            
            <p className="text-lg md:text-xl text-white/90 mb-12 max-w-xl mx-auto font-normal leading-relaxed">
              Pay anyone, everywhere. ENSRouter turns your ENS name into a
              self-describing payment endpoint with automatic routing and token swaps.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button 
                asChild 
                size="lg"
                className="bg-white text-black hover:bg-white/90 font-semibold text-base px-6 py-5 rounded-full group transition-all duration-300 hover:scale-105"
              >
                <Link href="/profile" className="flex items-center gap-2">
                  Set Up Profile
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
              
              <Button 
                asChild 
                variant="outline" 
                size="lg"
                className="border-white/30 text-white hover:bg-white/10 hover:border-white/50 font-semibold text-base px-6 py-5 rounded-full bg-transparent transition-all duration-300"
              >
                <Link href="/send">Send USDC</Link>
              </Button>
            </div>
          </div>
        </div>
        
        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
          <div className="w-6 h-10 rounded-full border-2 border-white/30 flex items-start justify-center p-2">
            <div className="w-1 h-2 bg-white/50 rounded-full animate-bounce" />
          </div>
        </div>
      </div>

      {/* How It Works */}
      <section className="relative py-24 px-4 bg-black border-t border-white/10">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              How It Works
            </h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: <Wallet className="w-6 h-6" />,
                title: "Set Preferences",
                desc: "Configure your preferred chain and token allocation once via ENS text records"
              },
              {
                icon: <Zap className="w-6 h-6" />,
                title: "Receive Payments",
                desc: "Anyone sends USDC to your ENS name. No need to specify chains or addresses"
              },
              {
                icon: <Globe className="w-6 h-6" />,
                title: "Auto-Route",
                desc: "Funds automatically bridge and swap to your preferred tokens on your chosen chain"
              }
            ].map((item, i) => (
              <Card 
                key={i} 
                className="p-6 bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-300 rounded-2xl"
              >
                <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-white mb-4">
                  {item.icon}
                </div>
                
                <h3 className="text-lg font-bold text-white mb-2">
                  {item.title}
                </h3>
                
                <p className="text-white/50 leading-relaxed text-sm">
                  {item.desc}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-4 bg-black border-t border-white/10">
        <div className="container mx-auto max-w-3xl">
          <div className="space-y-4">
            {[
              "No gas tokens needed on destination chains",
              "Portable preferences across any app",
              "Instant cross-chain bridging via Circle",
              "Gasless token swaps via Across Protocol"
            ].map((text, i) => (
              <div 
                key={i}
                className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10"
              >
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                  <span className="text-white text-xs">✓</span>
                </div>
                <p className="text-white/80 font-medium">
                  {text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 bg-black border-t border-white/10">
        <div className="container mx-auto max-w-5xl flex flex-col md:flex-row justify-between items-center gap-4">
          <span className="text-white/40 text-sm">
            ChainRouter
          </span>
          <p className="text-white/30 text-xs">
            Built for the ENS community
          </p>
        </div>
      </footer>
    </main>
  )
}