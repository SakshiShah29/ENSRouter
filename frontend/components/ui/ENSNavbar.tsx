"use client";

import { useState } from "react";
import Image from "next/image";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import {
  Navbar,
  NavBody,
  NavItems,
  MobileNav,
  MobileNavHeader,
  MobileNavMenu,
  MobileNavToggle,
} from "@/components/ui/resizable-navbar";

interface ENSNavbarProps {
  className?: string;
}

export function ENSNavbar({ className }: ENSNavbarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navLinks = [
    { name: "Profile", link: "/profile" },
    { name: "Send", link: "/send" },
  ];

  return (
    <div className={`absolute top-0 left-0 right-0 z-50 ${className || ""}`}>
      <Navbar className="sticky inset-x-0 top-0 w-full mt-4">
        {/* Desktop Navbar */}
        <NavBody className="border-2 border-white/40">
          {/* Logo */}
          <a
            href="/"
            className="relative z-20 flex items-center space-x-2 px-2 py-1 text-sm font-normal text-white"
          >
            <Image src="/logo.png" alt="ENSRouter Logo" width={62} height={62} />
            <span className="font-bold text-white">ENSRouter</span>
          </a>

          {/* Nav Items - Centered */}
          <NavItems items={navLinks} className="text-white" />

          {/* Wallet Connect Button */}
          <ConnectButton />
        </NavBody>

        {/* Mobile Navbar */}
        <MobileNav>
          <MobileNavHeader>
            {/* Logo */}
            <a
              href="/"
              className="relative z-20 flex items-center space-x-2 px-2 py-1 text-sm font-normal text-white"
            >
              <Image src="/logo.png" alt="ENSRouter Logo" width={62} height={62} />
              <span className="font-medium text-white">ENSRouter</span>
            </a>

            {/* Mobile Menu Toggle */}
            <MobileNavToggle
              isOpen={isMobileMenuOpen}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            />
          </MobileNavHeader>

          {/* Mobile Menu */}
          <MobileNavMenu
            isOpen={isMobileMenuOpen}
            onClose={() => setIsMobileMenuOpen(false)}
            className="bg-black/95 backdrop-blur-xl border border-white/10"
          >
            {navLinks.map((link, idx) => (
              <a
                key={idx}
                href={link.link}
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-full text-left text-white hover:text-[#a3e635] text-lg font-semibold py-2 px-4 rounded-lg hover:bg-white/10 transition-all"
              >
                {link.name}
              </a>
            ))}
            <ConnectButton />
          </MobileNavMenu>
        </MobileNav>
      </Navbar>
    </div>
  );
}
