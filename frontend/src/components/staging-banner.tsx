export function StagingBanner() {
    // Hanya tampilkan jika environment NEXT_PUBLIC_IS_STAGING bernilai "true"
    if (process.env.NEXT_PUBLIC_IS_STAGING !== "true") return null;

    return (
        <div className="fixed top-0 left-0 right-0 z-[100] w-full text-center py-1 bg-yellow-400 text-yellow-900 text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 shadow-sm">
            <span className="animate-pulse">⚠️</span>
            STAGING ENVIRONMENT - DATA IS NOT FOR PRODUCTION
            <span className="animate-pulse">⚠️</span>
        </div>
    );
}
