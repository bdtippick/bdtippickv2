"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { parseAndSaveExcel, ProgressCallback } from "@/lib/excelParser";

export default function Home() {
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [progress, setProgress] = useState({ current: 0, total: 0, currentSheet: "" });

  useEffect(() => {
    const signIn = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        const { error } = await supabase.auth.signInAnonymously();
        if (error) console.error("익명 로그인 에러:", error);
        else console.log("새로운 익명 세션 생성 성공!");
      } else {
        console.log("기존 세션 로드 성공:", session);
      }
    };
    signIn();
  }, []);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setFile(event.target.files[0]);
      setAnalysisResult(null); // 새 파일 선택시 이전 결과 초기화
      setProgress({ current: 0, total: 0, currentSheet: "" });
    }
  };

  const handleUpload = async () => {
    if (!file) {
      alert("업로드할 파일을 먼저 선택해주세요.");
      return;
    }
    setUploading(true);
    setAnalysisResult(null);
    setProgress({ current: 0, total: 0, currentSheet: "" });
    
    try {
      // 스토리지 업로드는 임시로 비활성화 (로컬 환경에서 버킷 없음)
      console.log('📁 파일 처리 시작:', file.name);

      // 진행률 콜백 함수
      const onProgress: ProgressCallback = (current, total, currentSheet) => {
        setProgress({ current, total, currentSheet });
      };

      // 프론트엔드에서 직접 파싱 및 저장
      const result = await parseAndSaveExcel(file, onProgress);

      console.log("Processing result:", result);
      setAnalysisResult({
        ...result,
        fileName: file.name,
        directProcessing: true
      });

      if (result.success) {
        alert(`✅ 파일 처리 완료!\n\n📤 ${file.name} 파일이 성공적으로 처리되었습니다.\n💾 총 ${result.totalSavedRows}개의 데이터가 저장되었습니다.`);
      } else {
        alert(`❌ 처리 실패!\n\n${result.message}`);
      }

    } catch (error: any) {
      console.error("업로드 프로세스 에러:", error);
      alert(`업로드 중 에러가 발생했습니다: ${error.message}`);
    } finally {
      setUploading(false);
      setProgress({ current: 0, total: 0, currentSheet: "" });
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-4xl space-y-6">
        <div className="bg-white rounded-xl shadow-md p-8">
          <h1 className="text-2xl font-bold text-center text-gray-800 mb-6">
            배달팁픽 정산 파일 업로드
          </h1>
          
          <div className="flex items-center justify-center w-full mb-4">
            <label htmlFor="file-upload" className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <svg className="w-8 h-8 mb-4 text-gray-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/></svg>
                <p className="mb-2 text-sm text-gray-500"><span className="font-semibold">클릭하여 파일 선택</span> 또는 드래그 앤 드롭</p>
                <p className="text-xs text-gray-500">엑셀 파일 (XLSX, XLS)</p>
              </div>
              <input id="file-upload" type="file" className="hidden" onChange={handleFileChange} accept=".xlsx, .xls" />
            </label>
          </div>
          
          {file && (
            <div className="text-center text-sm text-gray-600 mb-4">
              선택된 파일: <span className="font-medium">{file.name}</span>
            </div>
          )}
          
          {/* 진행률 표시 */}
          {uploading && progress.total > 0 && (
            <div className="mb-4">
              <div className="flex justify-between items-center text-sm text-gray-600 mb-2">
                <span>처리 중: {progress.currentSheet}</span>
                <span>{progress.current} / {progress.total}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                ></div>
              </div>
            </div>
          )}
          
          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="w-full px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            {uploading ? "처리 중..." : "엑셀 파일 업로드"}
          </button>
        </div>

        {/* 처리 결과 표시 */}
        {analysisResult && (
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">📊 처리 결과</h2>
            
            {analysisResult.directProcessing ? (
              /* 프론트엔드 직접 처리 결과 */
              <div>
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">📁 파일 정보</h3>
                  <p className="text-sm text-gray-600">파일명: {analysisResult.fileName}</p>
                  <p className="text-sm text-gray-600">처리 방식: 실시간 처리</p>
                </div>

                {/* 저장 결과 요약 */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-700 mb-3">💾 저장 결과</h3>
                  
                  {analysisResult.success ? (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center mb-2">
                        <div className="text-green-600 text-xl mr-2">✅</div>
                        <h4 className="font-medium text-green-800">저장 완료</h4>
                      </div>
                      <p className="text-green-700">총 <strong>{analysisResult.totalSavedRows}개</strong>의 데이터가 저장되었습니다.</p>
                      <p className="text-sm text-green-600 mt-2">{analysisResult.message}</p>
                    </div>
                  ) : (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex items-center mb-2">
                        <div className="text-red-600 text-xl mr-2">❌</div>
                        <h4 className="font-medium text-red-800">저장 실패</h4>
                      </div>
                      <p className="text-red-700">{analysisResult.message}</p>
                    </div>
                  )}


                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </main>
  );
}