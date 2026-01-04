import Navbar from "~/components/Navbar";
import type { Route } from "./+types/home";
import ResumeCard from "~/components/ResumeCard";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { usePuterStore } from "~/lib/puter";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Smart Curriculum AI" },
    { name: "description", content: "Smart feedback for your dream" },
  ];
}

export default function Home() {
  const { auth, kv } = usePuterStore();
  const navigate = useNavigate();
  const [resumes, setResumes] = useState<Resume[]>([])
  const [loadingResumes, setLoadingResumes] = useState(false);

  useEffect(() => {
    if(!auth.isAuthenticated) navigate('/auth?next=/');
  }, [auth.isAuthenticated])

  useEffect(() => {
    const loadResumes = async () => {
      setLoadingResumes(true);
      
      const resumes = (await kv.list('resumes:*', true)) as KVItem[]
    
      const parsedResumes = resumes?.map((resume) => (
        JSON.parse(resume.value) as Resume
      ))

      setResumes(parsedResumes || []);
      setLoadingResumes(false);
    }
    
    loadResumes()
  }, [])
  

  return <main className="bg-[url('/images/bg-main.svg')] bg-cover">
    <Navbar />
    {/* {window.puter.ai.chat()} */}
    
    <section className= "main-section">
      <div className="page-heading py-16">
        <h1>Sigue tus postulaciones y puntajes de tu CV</h1>
        {!loadingResumes && resumes?.length === 0 ? (
            <h2>No se encontraron currículums. Sube tu primer currículum para recibir comentarios.</h2>
        ): (
          <h2>Revisa tus envíos y recibe feedback inteligente con IA.</h2>
        )}
      </div>

      {!loadingResumes && resumes.length > 0 && (
        <div className="resumes-section">
          {resumes.map((resume) => (
            <ResumeCard key={resume.id} resume={resume}/>
          ))}
        </div>
      )}

      {!loadingResumes && resumes?.length === 0 && (
        <div className="flex flex-col items-center justify-center mt-10 gap-4">
          <Link to="/upload" className="primary-button w-fit text-xl font-semibold">
            Subir currículum
          </Link>
        </div>
      )}
    </section>


  </main>;
}
