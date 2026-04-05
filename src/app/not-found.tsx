import Link from "next/link";
import Image from "next/image";

export default function NotFound() {
    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-6 relative overflow-hidden">
            {/* Large, Subtle Background Layer for '404' */}
            <div className="absolute inset-0 flex items-center justify-center select-none pointer-events-none z-0">
                {/* <div className="text-[25rem] md:text-[40rem] font-bold text-brand-lightTeal opacity-10 tracking-tighter leading-none">404</div> */}
            </div>

            {/* Foreground Content Layer */}
            <div className="relative z-10 text-center w-full max-w-5xl flex flex-col items-center">
                {/* Horizontal Logo */}
                <div className="mb-20">
                    <Image
                        src="/horizontal-logo.png"
                        alt="ExplainMyLetter logo: clarity. confidence. next steps."
                        width={400}
                        height={110}
                        priority
                        className="w-auto h-auto max-w-[350px] md:max-w-[400px]"
                    />
                </div>

                {/* Crisp, Dark '404' Text */}
                <div className="text-[10rem] md:text-[16rem] font-bold text-brand-dark tracking-tighter leading-none mb-4">Error 404</div>

                {/* Messaging */}
                <div className="max-w-3xl">
                    <h1 className="text-4xl md:text-5xl font-bold text-brand-dark mb-6 leading-tight">Where’s the clarity?</h1>
                    <p className="text-xl md:text-2xl text-brand-darkTeal mb-14 leading-relaxed">
                        We are facing some issue and and working on it. Please check back later or return to the homepage for more clarity.
                    </p>
                    {/* Call to Action Button */}
                    <Link
                        href="/"
                        className="inline-flex items-center justify-center px-12 py-5 text-xl font-medium text-white bg-brand-darkTeal rounded-full hover:bg-brand-lightTeal transition-colors duration-200 shadow-xl hover:shadow-2xl"
                    >
                        Return to Clarity
                    </Link>
                </div>
            </div>
        </main>
    );
}
