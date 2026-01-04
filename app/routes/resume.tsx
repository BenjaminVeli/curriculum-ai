import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { usePuterStore } from "~/lib/puter";
import Summary from "~/components/Summary";
import Details from "~/components/Details";
import ATS from "~/components/ATS";

export const meta = () => ([
    {title: 'Resumind | Review'},
    {name: 'description', content: 'Detailed overview of your resume'},
])

const resume = () => {
    const { auth, isLoading, fs, kv } = usePuterStore();
    const { id } = useParams();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [imageUrl, setImageUrl] = useState('');
    const [resumeUrl, setResumeUrl] = useState('');
    const [feedback, setFeedback] = useState<Feedback | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        if(!isLoading && !auth.isAuthenticated) navigate(`/auth?next=/resume/${id}`);
    }, [isLoading])

    useEffect(() => {
        const loadResume = async () => {
            try{
                setLoading(true);

                const resume = await kv.get(`resume:${id}`);
                if (!resume) {
                    throw new Error("Resumen no encontrado");
                }

                const data = JSON.parse(resume);

                if (!data.feedback) {
                    throw new Error("Feedback no disponible");
                }

                const resumeBlob = await fs.read(data.resumePath);
                if (!resumeBlob) throw new Error("No se pudo leer el PDF");

                const pdfBlob = new Blob([resumeBlob], { type: "application/pdf" });
                setResumeUrl(URL.createObjectURL(pdfBlob));

                const imageBlob = await fs.read(data.imagePath);
                if (!imageBlob) throw new Error("No se pudo leer la imagen");

                setImageUrl(URL.createObjectURL(imageBlob));
                setFeedback(data.feedback);
             } catch (err) {
                setError(err instanceof Error ? err.message : "Error desconocido");
            } finally {
                setLoading(false);
            }
        }

        loadResume();
    }, [id]);

    return (
        <main className="!pt-0">
            <nav className="resume-nav">
                <Link to="/" className="back-button">
                    <img src="/icons/back.svg" alt="logo" className="w-2.5 h-2.5" />
                    <span className="text-gray-800 text-sm font-semibold">Volver a la página de inicio</span>
                </Link>
            </nav>
            <div className="flex flex-row w-full max-lg:flex-col-reverse">
                <section className="feedback-section bg-[url('/images/bg-small.svg') bg-cover h-[100vh] sticky top-0 items-center justify-center">
                    {imageUrl && resumeUrl && (
                        <div className="animate-in fade-in duration-1000 gradient-border max-sm:m-0 h-[90%] max-wxl:h-fit w-fit">
                            <a href={resumeUrl} target="_blank" rel="noopener noreferrer">
                                <img
                                    src={imageUrl}
                                    className="w-full h-full object-contain rounded-2xl"
                                    title="resume"
                                />
                            </a>
                        </div>
                    )}
                </section>
                <section className="feedback-section">
                    <h2 className="text-4xl !text-black font-bold">Revisión del resumen</h2>

                    {loading && (
                        <img src="/images/resume-scan-2.gif" className="w-full" />
                    )}

                    {!loading && error && (
                        <p className="text-red-500 font-semibold">{error}</p>
                    )}

                    {!loading && feedback && (
                        <div className="flex flex-col gap-8 animate-in fade-in duration-1000">
                        <Summary feedback={feedback} />
                        <ATS score={feedback.ATS.score || 0} suggestions={feedback.ATS.tips || []} />
                        <Details feedback={feedback} />
                        </div>
                    )}
                </section>
            </div>
        </main>
    )
}

export default resume