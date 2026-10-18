import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Bot, Zap, Shield, Sparkles, MessageSquare, ChevronRight } from 'lucide-react';
import { useListPackages } from '@workspace/api-client-react';

export default function Landing() {
  const { data: packages } = useListPackages();

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-24 pb-32 md:pt-36 md:pb-48">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-background to-background"></div>
        <div className="container relative mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-sm text-primary mb-8">
            <Sparkles size={16} />
            <span>The premier AI assistant for Indonesia</span>
          </div>
          <h1 className="mx-auto max-w-4xl font-sans text-5xl font-bold tracking-tight text-white sm:text-7xl">
            Think clearer.<br className="hidden sm:block" /> Work faster.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
            AskMeAI is your intelligent sidekick. Write code, draft essays, and solve problems with the most capable AI model, beautifully packaged for focused work.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/register" className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-primary px-8 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 hover:scale-105">
              Start Chatting Now <ChevronRight size={18} />
            </Link>
            <Link href="/pricing" className="inline-flex h-12 items-center justify-center rounded-lg border border-white/10 bg-white/5 px-8 text-base font-medium text-white transition-colors hover:bg-white/10">
              View Pricing
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="border-t border-white/5 bg-black/40 py-24">
        <div className="container mx-auto px-4">
          <div className="mb-16 text-center">
            <h2 className="text-3xl font-bold text-white sm:text-4xl">Built for deep focus</h2>
            <p className="mt-4 text-muted-foreground">Everything you need to get work done, without the noise.</p>
          </div>
          
          <div className="grid gap-8 md:grid-cols-3">
            {[
              { icon: Zap, title: "Lightning Fast", desc: "Experience zero latency chatting with optimized streaming responses." },
              { icon: MessageSquare, title: "Context Aware", desc: "Organize your thoughts into distinct threads that remember history." },
              { icon: Shield, title: "Private & Secure", desc: "Your data stays yours. We use enterprise-grade encryption for all chats." }
            ].map((feature, i) => (
              <div key={i} className="rounded-2xl border border-white/5 bg-card/50 p-8 transition-colors hover:bg-card">
                <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <feature.icon size={24} />
                </div>
                <h3 className="mb-3 text-xl font-semibold text-white">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Preview */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="mb-16 text-center">
            <h2 className="text-3xl font-bold text-white sm:text-4xl">Simple, transparent pricing</h2>
            <p className="mt-4 text-muted-foreground">Pay only for what you need with our credit system.</p>
          </div>
          
          <div className="mx-auto grid max-w-5xl gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {packages?.map((pkg) => (
              <div key={pkg.id} className="flex flex-col rounded-2xl border border-white/5 bg-card p-6 shadow-sm">
                <h3 className="font-medium text-muted-foreground">{pkg.name}</h3>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-white">Rp{pkg.price.toLocaleString('id-ID')}</span>
                </div>
                <div className="mt-6 flex flex-1 flex-col gap-4">
                  <div className="flex items-center gap-3 text-sm text-white">
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-primary">
                      <Zap size={12} />
                    </div>
                    {pkg.credits.toLocaleString('id-ID')} Credits
                  </div>
                </div>
                <Link href="/register" className="mt-8 inline-flex h-10 w-full items-center justify-center rounded-lg border border-white/10 bg-white/5 text-sm font-medium text-white transition-colors hover:bg-white/10">
                  Get Started
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>
      
      {/* CTA */}
      <section className="border-t border-white/5 py-24">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white sm:text-4xl">Ready to upgrade your workflow?</h2>
          <p className="mt-4 text-muted-foreground">Join thousands of professionals in Indonesia using AskMeAI.</p>
          <Link href="/register" className="mt-8 inline-flex h-12 items-center justify-center rounded-lg bg-primary px-8 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 hover:scale-105">
            Create Free Account
          </Link>
        </div>
      </section>
    </div>
  );
}
