import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import FileUploader from "~/components/FileUploader";
import Navbar from "~/components/Navbar"
import { prepareInstructions } from "~/constants";
import { convertPdfToImage } from "~/lib/pdf2img";
import { usePuterStore } from "~/lib/puter";
import { generateUUID } from "~/lib/utils";
import toast from "react-hot-toast";

const upload = () => {
    const {fs, ai, kv} = usePuterStore();
    const navigate = useNavigate();
    const [isProcessing, setIsProcessing ] = useState(false);
    const [statusText, setStatusText] = useState('');
    const [file, setFile] = useState<File | null>(null)

    const handleFileSelect = (file: File | null) => {
        setFile(file)
    } 

    const handleAnalyze = async ({ companyName, jobTitle, jobDescription, file }: { companyName: string, jobTitle: string, jobDescription: string, file: File  }) => {
        setIsProcessing(true);
        let shouldStopProcessing = true;
        try{

            //
            setStatusText('Subiendo el archivo...');
            const uploadedFile = await fs.upload([file]);
            if (!uploadedFile) throw new Error('No se pudo cargar el archivo');
            // if(!uploadedFile) return setStatusText('Error: Failed to upload file');

            //
            setStatusText('Convirtiendo a imagen...');
            const imageFile = await convertPdfToImage(file);
            if (imageFile.error) {
                throw new Error(`Error de conversión de PDF: ${imageFile.error}`);
            }
            if (!imageFile?.file) {
                throw new Error('No se pudo convertir PDF a imagen: no se generó ningún archivo');
            }
            // if(!imageFile.file) return setStatusText('Error: Failed to convert PDF to image');

            //
            setStatusText('Subiendo la imagen...');
            const uploadedImage = await fs.upload([imageFile.file]);
            if (!uploadedImage) throw new Error('No se pudo cargar la imagen');
            // if(!uploadedImage) return setStatusText('Error: Failed to upload image');

            //
            setStatusText('Preparando datos...');
            const uuid = generateUUID();
            const data = {
                id: uuid,
                resumePath: uploadedFile.path,
                imagePath: uploadedImage.path,
                companyName,
                jobTitle,
                jobDescription,
                feedback: '',
            }
            await kv.set(`Resumen:${uuid}`, JSON.stringify(data));

            setStatusText('Analizando...');
            const feedback = await ai.feedback(
                uploadedFile.path,
                prepareInstructions({ jobTitle, jobDescription })
            )

            if (!feedback?.message?.content)
                throw new Error("La IA devolvió comentarios vacíos");

            let feedbackText: string;

            try {
            feedbackText =
                typeof feedback.message.content === "string"
                ? feedback.message.content
                : feedback.message.content[0].text;

            data.feedback = JSON.parse(feedbackText);
            } catch {
                throw new Error("Formato de respuesta de IA no válido");
            }

            await kv.set(`resume:${uuid}`, JSON.stringify(data));

            setStatusText("Análisis completo, redireccionando...");
            navigate(`/resume/${uuid}`);
            shouldStopProcessing = false;
        } catch (error) {
            console.error("Analizando error:", error);
            setStatusText( error instanceof Error ? `Error: ${error.message}` : "Se produjo un error inesperado");
        } finally {
            if (shouldStopProcessing) {
                setIsProcessing(false);
            }
        }
    }

    const validateForm = ({
            companyName, jobTitle, jobDescription, file, }: {
            companyName: string;
            jobTitle: string;
            jobDescription: string;
            file: File | null;
        }) => {
        const fields = [
            { value: companyName, message: "Debes ingresar el nombre de la empresa", id: "company-name-error"},
            { value: jobTitle, message: "Debes ingresar el puesto de trabajo", id: "job-title-error"},
            { value: jobDescription, message: "Debes ingresar la descripción del puesto", id: "job-description-error"},
            { value: file, message: "Debes subir tu currículum", id: "file-error"},
        ];

        const error = fields.find(field => !field.value);

        if (error) {
            toast.error(error.message, { id: error.id });
            return false;
        }

        return true;
    };

    const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        
        const form = e.currentTarget.closest('form');
        if(!form) return;
        
        const formData = new FormData(form);

        const companyName = formData.get('company-name') as string;
        const jobTitle = formData.get('job-title') as string;
        const jobDescription = formData.get('job-description') as string;

        if (
            !validateForm({ companyName, jobTitle, jobDescription, file, })
        ) {
            return;
        }
        if (!file) return;
        handleAnalyze({companyName, jobTitle, jobDescription, file})
    }   

    return (
    <main className="bg-[url('/images/bg-main.svg')] bg-cover">
        <Navbar />

        <section className="main-section">
            <div className="page-heading py-16">
                <h1>Comentarios inteligentes para el trabajo de tus sueños</h1>
                {isProcessing ? (
                    <>
                        <h2>{statusText}</h2>
                        <img src="/images/resume-scan.gif" className="w-[350px] h-[350px] object-cover" />
                    </>
                ) : (
                    <h2>Envíe su currículum para obtener una puntuación ATS y consejos de mejora</h2>
                )}
                {!isProcessing && (
                    <form id="upload-form" onSubmit={handleSubmit} className="flex flex-col gap-4 mt-8">
                        <div className="form-div">
                            <label htmlFor="company-name">Nombre de la empresa</label>
                            <input type="text" name="company-name" placeholder="Nombre de la empresa" id="company-name" />
                        </div>
                        <div className="form-div">
                            <label htmlFor="job-title">Puesto de trabajo</label>
                            <input type="text" name="job-title" placeholder="Puesto de trabajo" id="job-title" />
                        </div>
                        <div className="form-div">
                            <label htmlFor="job-description">Descripción del puesto</label>
                            <textarea rows={5} name="job-description" placeholder="Descripción del puesto" id="job-description" />
                        </div>
                        <div className="form-div">
                            <label htmlFor="uploader">Subír currículum</label>
                            <FileUploader onFileSelect={handleFileSelect} />
                        </div>
                        <button className="primary-button" type="submit">
                            Analizar Resumen
                        </button>
                    </form>
                )}
            </div>
        </section>
    </main>
  )
}

export default upload