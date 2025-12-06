"use client"

import React from "react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const THEME = {
	primary: "#19C2E6",
	accent: "#FED801",
	cta: "#FF5A1F",
	text: "#fff",
};

export default function RegisterPage() {
	return (
		<div 
			className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center" 
			style={{ 
				background: `linear-gradient(135deg, ${THEME.primary} 0%, #0EA5C9 100%)`,
				fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
			}}
		>
			<div className="max-w-5xl mx-auto w-full">
				<div className="text-center mb-10">
					<h1 
						className="text-4xl font-bold mb-3" 
						style={{ 
							color: THEME.text,
							letterSpacing: "-0.5px",
							textShadow: "0 2px 10px rgba(0, 0, 0, 0.1)"
						}}
					>
						Join Nivaran
					</h1>
					<p className="text-lg" style={{ color: "rgba(255, 255, 255, 0.9)" }}>
						Choose how you'd like to make a difference
					</p>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
					{/* Register as User */}
					<Card 
						style={{ 
							borderRadius: "16px",
							border: "none",
							boxShadow: "0 20px 60px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05)",
							transition: "transform 0.3s ease, box-shadow 0.3s ease",
							cursor: "pointer"
						}}
						className="hover:scale-[1.02] hover:shadow-2xl"
					>
						<CardHeader style={{ paddingBottom: "16px" }}>
							<div className="flex flex-col items-center text-center gap-4">
								<Avatar 
									className="w-24 h-24 rounded-full"
									style={{
										background: `linear-gradient(135deg, ${THEME.primary}, ${THEME.accent})`,
										padding: "4px"
									}}
								>
									<div className="w-full h-full bg-white rounded-full flex items-center justify-center">
										<AvatarImage src="https://api.dicebear.com/7.x/micah/svg?seed=FriendlyUser" />
										<AvatarFallback>U</AvatarFallback>
									</div>
								</Avatar>
								<div>
									<h2 
										className="text-2xl font-bold mb-2" 
										style={{ 
											color: THEME.primary,
											letterSpacing: "-0.3px"
										}}
									>
										Individual User
									</h2>
									<p className="text-sm leading-relaxed" style={{ color: "#6b7280" }}>
										Create a personal account to report cases, adopt animals and make a difference in your community.
									</p>
								</div>
							</div>
						</CardHeader>
						<CardContent className="pt-6 pb-6">
							<div className="flex justify-center">
								<Link href="/user-register" className="w-full">
									<Button 
										className="w-full"
										style={{ 
											background: THEME.cta, 
											color: THEME.text,
											padding: "13px 24px",
											fontSize: "15px",
											fontWeight: 600,
											borderRadius: "10px",
											border: "none",
											boxShadow: "0 4px 12px rgba(255, 90, 31, 0.3)",
											transition: "all 0.2s ease"
										}}
									>
										Register as User
									</Button>
								</Link>
							</div>
						</CardContent>
					</Card>

					{/* Register as NGO */}
					<Card 
						style={{ 
							borderRadius: "16px",
							border: "none",
							boxShadow: "0 20px 60px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05)",
							transition: "transform 0.3s ease, box-shadow 0.3s ease",
							cursor: "pointer"
						}}
						className="hover:scale-[1.02] hover:shadow-2xl"
					>
						<CardHeader style={{ paddingBottom: "16px" }}>
							<div className="flex flex-col items-center text-center gap-4">
								<Avatar 
									className="w-24 h-24 rounded-full overflow-hidden"
									style={{
										background: `linear-gradient(135deg, ${THEME.accent}, ${THEME.cta})`,
										padding: "4px"
									}}
								>
									<div className="w-full h-full bg-white rounded-full flex items-center justify-center overflow-hidden">
										<AvatarImage
											src="/ngo_building.svg"
											style={{ objectFit: 'contain', transform: 'scale(0.82)' }}
										/>
										<AvatarFallback>NG</AvatarFallback>
									</div>
								</Avatar>
								<div>
									<h2 
										className="text-2xl font-bold mb-2" 
										style={{ 
											color: THEME.primary,
											letterSpacing: "-0.3px"
										}}
									>
										NGO / Organization
									</h2>
									<p className="text-sm leading-relaxed" style={{ color: "#6b7280" }}>
										Register your organization to manage cases, verify adopters and receive community support.
									</p>
								</div>
							</div>
						</CardHeader>
						<CardContent className="pt-6 pb-6">
							<div className="flex justify-center">
								<Link href="/ngo-register" className="w-full">
									<Button 
										className="w-full"
										style={{ 
											background: THEME.primary, 
											color: THEME.text,
											padding: "13px 24px",
											fontSize: "15px",
											fontWeight: 600,
											borderRadius: "10px",
											border: "none",
											boxShadow: "0 4px 12px rgba(25, 194, 230, 0.3)",
											transition: "all 0.2s ease"
										}}
									>
										Register as NGO
									</Button>
								</Link>
							</div>
						</CardContent>
					</Card>
				</div>

				{/* Login link */}
				<div className="mt-10 text-center">
					<p 
						className="text-base" 
						style={{ 
							color: "rgba(255, 255, 255, 0.95)",
							fontSize: "15px"
						}}
					>
						Already have an account?{' '}
						<Link 
							href="/login" 
							className="font-semibold transition-all" 
							style={{ 
								color: THEME.text,
								textDecoration: "none",
								borderBottom: "2px solid rgba(255, 255, 255, 0.5)",
								paddingBottom: "2px"
							}}
						>
							Sign in
						</Link>
					</p>
				</div>
			</div>
		</div>
	);
}

