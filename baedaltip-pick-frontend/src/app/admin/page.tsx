"use client";

import { useState, useEffect } from "react";
import { supabase, supabaseAdmin } from "@/lib/supabaseClient";
import Link from "next/link";

interface TotalSummary {
  id: number;
  rider_id: string;
  total_orders: number;
  settlement_amount: number;
  total_support_fund: number;
  deduction_details: number;
  total_settlement_amount: number;
  employment_insurance: number;
  industrial_accident_insurance: number;
  hourly_insurance: number;
  retroactive_insurance: number;
  expected_settlement_amount: number;
  actual_payment_amount: number;
  commission_deduction: number;
  remuneration: number;
  settlement_year?: number;
  settlement_month?: number;
  settlement_week?: number;
  created_at: string;
}

interface Statistics {
  totalRiders: number;
  totalOrders: number;
  totalSettlementAmount: number;
  totalActualPayment: number;
  avgOrdersPerRider: number;
  avgSettlementPerRider: number;
}

export default function AdminDashboard() {
  const [totalSummaryData, setTotalSummaryData] = useState<TotalSummary[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  
  // 전체 지점에 적용할 원천세 계산 방식과 수기 입력 상태 관리
  const [globalAmountType, setGlobalAmountType] = useState<'commission' | 'remuneration'>('commission');

  const [manualInputs, setManualInputs] = useState<{[key: number]: {mission: string, preDeduction: string}}>({});
  const [selectedWeek, setSelectedWeek] = useState<string>('all');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // total_summary 데이터 가져오기
      const { data: summaryData, error: summaryError } = await supabase
        .from('total_summary')
        .select('*')
        .order('created_at', { ascending: false });

      if (summaryError) {
        console.error('데이터 조회 에러:', summaryError);
        return;
      }

      setTotalSummaryData(summaryData || []);

      // 통계 계산
      if (summaryData && summaryData.length > 0) {
        const stats: Statistics = {
          totalRiders: summaryData.length,
          totalOrders: summaryData.reduce((sum, item) => sum + (item.total_orders || 0), 0),
          totalSettlementAmount: summaryData.reduce((sum, item) => sum + (item.total_settlement_amount || 0), 0),
          totalActualPayment: summaryData.reduce((sum, item) => sum + (item.actual_payment_amount || 0), 0),
          avgOrdersPerRider: summaryData.reduce((sum, item) => sum + (item.total_orders || 0), 0) / summaryData.length,
          avgSettlementPerRider: summaryData.reduce((sum, item) => sum + (item.total_settlement_amount || 0), 0) / summaryData.length,
        };
        setStatistics(stats);
      }

    } catch (error) {
      console.error('데이터 로딩 중 에러:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('ko-KR').format(num);
  };

  const formatCurrency = (num: number) => {
    return new Intl.NumberFormat('ko-KR').format(num);
  };

  // 미션비와 선차감내역을 반영한 계산된 금액 구하기
  const getCalculatedAmount = (originalAmount: number, itemId: number) => {
    const mission = parseFloat(manualInputs[itemId]?.mission || '0') || 0;
    const preDeduction = Math.abs(parseFloat(manualInputs[itemId]?.preDeduction || '0') || 0); // 절댓값으로 처리
    return originalAmount + mission - preDeduction;
  };

  // 수수료공제후지급액에 모든 데이터를 반영한 완전 계산된 금액 구하기
  const getFullyCalculatedCommissionAmount = (item: TotalSummary, itemId: number) => {
    const mission = parseFloat(manualInputs[itemId]?.mission || '0') || 0;
    const preDeduction = Math.abs(parseFloat(manualInputs[itemId]?.preDeduction || '0') || 0);
    
    // 수수료공제후지급액 + 지원금 - 공제내역(차감) - 각종 보험료(차감) + 소급보험료(더함) + 미션비 - 선차감내역
    const calculatedAmount = item.commission_deduction 
      + item.total_support_fund 
      - Math.abs(item.deduction_details)
      - Math.abs(item.employment_insurance)
      - Math.abs(item.industrial_accident_insurance) 
      - Math.abs(item.hourly_insurance)
      + item.retroactive_insurance  // 소급보험료는 더함 (음수값이므로 그대로 더하면 됨)
      + mission 
      - preDeduction;
      
    return calculatedAmount;
  };



  // 주차별 옵션 생성 (데이터베이스 주차 정보 기반)
  const getWeekOptions = () => {
    const weekMap = new Map<string, string[]>();
    
    totalSummaryData.forEach(item => {
      // 데이터베이스에 저장된 주차 정보 사용
      if (item.settlement_year && item.settlement_month && item.settlement_week) {
        const year = item.settlement_year;
        const month = item.settlement_month;
        const week = item.settlement_week;
        
        const monthKey = `${year}-${month.toString().padStart(2, '0')}`;
        const weekLabel = `${year}년 ${month}월 ${week}주차`;
        const weekValue = `${year}-${month}-W${week}`;
        
        if (!weekMap.has(monthKey)) {
          weekMap.set(monthKey, []);
        }
        
        if (!weekMap.get(monthKey)!.some(w => w.includes(weekValue))) {
          weekMap.get(monthKey)!.push(`${weekValue}|${weekLabel}`);
        }
      }
    });

    const options: Array<{ value: string; label: string; isMonth?: boolean; isWeek?: boolean }> = [
      { value: 'all', label: '전체 주차' }
    ];
    
    // 월별로 정렬하고 각 월 내에서 주차별로 정렬
    Array.from(weekMap.entries())
      .sort(([a], [b]) => b.localeCompare(a)) // 최신 월부터
      .forEach(([monthKey, weeks]) => {
        const [year, month] = monthKey.split('-');
        options.push({
          value: monthKey,
          label: `${year}년 ${parseInt(month)}월`,
          isMonth: true
        });
        
        weeks
          .sort((a, b) => {
            const weekA = parseInt(a.split('|')[0].split('W')[1]);
            const weekB = parseInt(b.split('|')[0].split('W')[1]);
            return weekB - weekA; // 최신 주차부터
          })
          .forEach(weekData => {
            const [weekValue, weekLabel] = weekData.split('|');
            options.push({
              value: weekValue,
              label: `  ${weekLabel}`,
              isWeek: true
            });
          });
      });

    return options;
  };

  // 선택된 주차에 따라 데이터 필터링 (데이터베이스 주차 정보 기반)
  const getFilteredData = () => {
    if (selectedWeek === 'all') {
      return totalSummaryData;
    }
    
    if (selectedWeek.includes('-W')) {
      // 특정 주차 선택 (예: "2024-6-W2")
      const [year, month, weekPart] = selectedWeek.split('-');
      const week = weekPart.replace('W', '');
      
      return totalSummaryData.filter(item => {
        return item.settlement_year?.toString() === year && 
               item.settlement_month?.toString() === month && 
               item.settlement_week?.toString() === week;
      });
    } else {
      // 월 전체 선택
      const [year, month] = selectedWeek.split('-');
      return totalSummaryData.filter(item => {
        return item.settlement_year?.toString() === year && 
               item.settlement_month?.toString() === month.replace(/^0+/, ''); // 앞의 0 제거
      });
    }
  };

  // 라이더 정산 데이터 일괄 저장 함수
  const saveRiderSettlements = async () => {
    if (filteredData.length === 0) {
      alert('저장할 데이터가 없습니다.');
      return;
    }

    if (!confirm('현재 표시된 데이터를 라이더 정산 테이블에 저장하시겠습니까?')) {
      return;
    }

    try {
      console.log('💾 라이더 정산 데이터 저장 시작...');
      
      // 파일명에서 상호명 추출 (업로드된 파일 정보에서)
      const extractCompanyName = (): string | null => {
        // 실제로는 업로드된 파일명 정보를 가져와야 하지만, 
        // 현재는 기본값 사용 (추후 파일 업로드 시 저장된 정보 활용)
        return null;
      };

      const companyName = extractCompanyName();
      
      const settlementData = filteredData.map(item => {
        const mission = parseFloat(manualInputs[item.id]?.mission || '0') || 0;
        const preDeduction = Math.abs(parseFloat(manualInputs[item.id]?.preDeduction || '0') || 0);
        
        // 최종 정산금액 계산 (수수료공제후지급액 기준)
        const finalSettlementAmount = getFullyCalculatedCommissionAmount(item, item.id);
        
        // 원천세 계산 (globalAmountType에 따라)
        let taxBaseAmount = 0;
        switch(globalAmountType) {
          case 'commission':
            taxBaseAmount = finalSettlementAmount;
            break;
          case 'remuneration':
            taxBaseAmount = getCalculatedAmount(item.remuneration, item.id);
            break;
        }
        const withholding = Math.round(taxBaseAmount * 0.033);
        
        // 실제 지급액 = 최종정산금액 - 원천세
        const actualPayment = finalSettlementAmount - withholding;

        return {
          rider_id: item.rider_id,
          settlement_year: item.settlement_year,
          settlement_month: item.settlement_month,
          settlement_week: item.settlement_week,
          company_name: companyName,
          
          // 기본 정산 데이터
          total_orders: item.total_orders,
          settlement_amount: item.settlement_amount,
          support_fund: item.total_support_fund,
          deduction_details: item.deduction_details,
          
          // 보험료들
          employment_insurance: item.employment_insurance,
          industrial_accident_insurance: item.industrial_accident_insurance,
          hourly_insurance: item.hourly_insurance,
          retroactive_insurance: item.retroactive_insurance,
          
          // 수기 입력 데이터
          mission_fee: mission,
          pre_deduction: preDeduction,
          
          // 최종 계산 결과
          final_settlement_amount: finalSettlementAmount,
          withholding_tax: withholding,
          actual_payment_amount: actualPayment
        };
      });

      console.log('💾 저장할 데이터:', settlementData);

      // 기존 데이터 삭제 (같은 주차)
      if (settlementData.length > 0) {
        const firstItem = settlementData[0];
        const { error: deleteError } = await supabaseAdmin
          .from('rider_settlements')
          .delete()
          .eq('settlement_year', firstItem.settlement_year)
          .eq('settlement_month', firstItem.settlement_month)
          .eq('settlement_week', firstItem.settlement_week);

        if (deleteError) {
          console.error('❌ 기존 데이터 삭제 실패:', deleteError);
        } else {
          console.log('✅ 기존 데이터 삭제 완료');
        }
      }

      // 새 데이터 삽입
      const { data, error } = await supabaseAdmin
        .from('rider_settlements')
        .insert(settlementData);

      if (error) {
        console.error('❌ 저장 실패:', error);
        alert(`저장 중 오류가 발생했습니다: ${error.message}`);
        return;
      }

      console.log('✅ 저장 성공:', data);
      alert(`✅ 성공!\n\n${settlementData.length}개의 라이더 정산 데이터가 저장되었습니다.\n상호명: ${companyName}\n\n이제 라이더들이 /rider 페이지에서 본인의 정산 내역을 조회할 수 있습니다.`);

    } catch (error) {
      console.error('💥 저장 중 에러:', error);
      alert(`저장 중 예상치 못한 오류가 발생했습니다: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const filteredData = getFilteredData();

  // 페이지네이션 계산 (필터링된 데이터 기준)
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredData.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent align-[-0.125em]"></div>
          <p className="mt-4 text-gray-600">데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">관리자 대시보드</h1>
              <p className="text-gray-600 mt-1">배달팁픽 정산 데이터 관리</p>
            </div>
            <Link 
              href="/"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              홈으로 돌아가기
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 통계 카드들 */}
        {statistics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">총 라이더 수</p>
                  <p className="text-2xl font-semibold text-gray-900">{formatNumber(statistics.totalRiders)}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"/>
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">총 주문 수</p>
                  <p className="text-2xl font-semibold text-gray-900">{formatNumber(statistics.totalOrders)}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z"/>
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z"/>
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">총 정산 금액</p>
                  <p className="text-2xl font-semibold text-gray-900">{formatCurrency(statistics.totalSettlementAmount)}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z"/>
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">총 실지급액</p>
                  <p className="text-2xl font-semibold text-gray-900">{formatCurrency(statistics.totalActualPayment)}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 데이터 테이블 */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-6">
                <div>
                  <h2 className="text-xl font-semibold text-gray-800">정산 데이터 목록</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    총 {totalSummaryData.length}개 중 {filteredData.length}개 표시
                  </p>
                </div>
                
                {/* 주차 선택 드롭다운 */}
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-700">주차 선택:</span>
                  <select
                    value={selectedWeek}
                    onChange={(e) => {
                      setSelectedWeek(e.target.value);
                      setCurrentPage(1); // 필터 변경시 첫 페이지로
                    }}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {getWeekOptions().map((option) => (
                      <option 
                        key={option.value} 
                        value={option.value}
                        style={{
                          fontWeight: option.isMonth ? 'bold' : 'normal',
                          paddingLeft: option.isWeek ? '20px' : '0px'
                        }}
                      >
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="flex flex-col space-y-4">
                {/* 원천세 계산 기준 */}
                <div className="flex items-center space-x-4">
                  <span className="text-sm font-medium text-gray-700">원천세 계산 기준:</span>
                  <div className="flex space-x-3">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="amountType"
                        value="commission"
                        checked={globalAmountType === 'commission'}
                        onChange={(e) => setGlobalAmountType(e.target.value as 'commission')}
                        className="mr-2"
                      />
                      <span className="text-sm text-green-600 font-medium">정산금액</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="amountType"
                        value="remuneration"
                        checked={globalAmountType === 'remuneration'}
                        onChange={(e) => setGlobalAmountType(e.target.value as 'remuneration')}
                        className="mr-2"
                      />
                      <span className="text-sm text-green-600 font-medium">보수액</span>
                    </label>
                  </div>
                </div>

                {/* 라이더 데이터 저장 버튼 */}
                <div className="flex items-center justify-end">
                  <button
                    onClick={saveRiderSettlements}
                    disabled={saving || filteredData.length === 0}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                  >
                    {saving ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>저장 중...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <span>라이더 데이터 저장</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {totalSummaryData.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">데이터가 없습니다</h3>
              <p className="mt-1 text-sm text-gray-500">
                먼저 엑셀 파일을 업로드해주세요.
              </p>
              <div className="mt-6">
                <Link
                  href="/"
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  엑셀 업로드하기
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full border border-gray-200"
                       style={{ minWidth: '1800px' }}>
                  <thead className="bg-gray-50">
                    <tr className="border-b border-gray-200">
                      <th className="px-3 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap sticky left-0 bg-gray-50 z-10 border-r border-gray-200">라이더ID</th>
                      <th className="px-3 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap border-r border-gray-200">총주문수</th>
                      <th className="px-3 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap border-r border-gray-200">지원금</th>
                      <th className="px-3 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap border-r border-gray-200">공제내역</th>
                      <th className="px-3 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap border-r border-gray-200">고용보험</th>
                      <th className="px-3 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap border-r border-gray-200">산재보험</th>
                      <th className="px-3 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap border-r border-gray-200">시간제보험</th>
                      <th className="px-3 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap border-r border-gray-200">소급보험</th>
                      <th className="px-3 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap border-r border-gray-200">미션비</th>
                      <th className="px-3 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap border-r border-gray-200">선차감내역</th>
                      <th className="px-3 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap border-r border-gray-200">정산금액</th>
                      <th className="px-3 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap border-r border-gray-200">보수액</th>
                      <th className="px-3 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">원천세(3.3%)</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    {currentItems.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50 border-b border-gray-200">
                        <td className="px-3 py-3 whitespace-nowrap text-sm font-medium text-gray-900 text-center sticky left-0 bg-white z-10 border-r border-gray-200">
                          <div className="flex flex-col">
                            <span className="font-bold">{item.rider_id}</span>
                            <span className="text-xs text-blue-600 font-medium mt-1">
                              지급: {(() => {
                                let calculatedAmount = 0;
                                
                                switch(globalAmountType) {
                                  case 'commission':
                                    calculatedAmount = getFullyCalculatedCommissionAmount(item, item.id);
                                    break;
                                  case 'remuneration':
                                    calculatedAmount = getCalculatedAmount(item.remuneration, item.id);
                                    break;
                                }
                                
                                const withholding = Math.round(calculatedAmount * 0.033);
                                const actualPayment = calculatedAmount - withholding;
                                return formatCurrency(actualPayment);
                              })()}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-900 text-center border-r border-gray-200">
                          {formatNumber(item.total_orders)}
                        </td>
                        <td className={`px-3 py-3 whitespace-nowrap text-sm text-center border-r border-gray-200 ${item.total_support_fund < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                          {formatCurrency(item.total_support_fund)}
                        </td>
                        <td className={`px-3 py-3 whitespace-nowrap text-sm text-center border-r border-gray-200 ${item.deduction_details < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                          {formatCurrency(item.deduction_details)}
                        </td>
                        <td className={`px-3 py-3 whitespace-nowrap text-sm text-center border-r border-gray-200 ${item.employment_insurance < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                          {formatCurrency(item.employment_insurance)}
                        </td>
                        <td className={`px-3 py-3 whitespace-nowrap text-sm text-center border-r border-gray-200 ${item.industrial_accident_insurance < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                          {formatCurrency(item.industrial_accident_insurance)}
                        </td>
                        <td className={`px-3 py-3 whitespace-nowrap text-sm text-center border-r border-gray-200 ${item.hourly_insurance < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                          {formatCurrency(item.hourly_insurance)}
                        </td>
                        <td className={`px-3 py-3 whitespace-nowrap text-sm text-center border-r border-gray-200 ${item.retroactive_insurance < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                          {formatCurrency(item.retroactive_insurance)}
                        </td>
                        
                        {/* 미션비 입력 */}
                        <td className="px-3 py-3 whitespace-nowrap text-sm text-center border-r border-gray-200">
                          <input
                            type="text"
                            value={manualInputs[item.id]?.mission || ''}
                            onChange={(e) => setManualInputs(prev => ({
                              ...prev,
                              [item.id]: { ...prev[item.id], mission: e.target.value }
                            }))}
                            className="w-20 px-2 py-1 text-xs border border-gray-300 rounded text-center"
                            placeholder="미션비"
                          />
                        </td>
                        
                        {/* 선차감내역 입력 */}
                        <td className="px-3 py-3 whitespace-nowrap text-sm text-center border-r border-gray-200">
                          <input
                            type="text"
                            value={manualInputs[item.id]?.preDeduction || ''}
                            onChange={(e) => setManualInputs(prev => ({
                              ...prev,
                              [item.id]: { ...prev[item.id], preDeduction: e.target.value }
                            }))}
                            className="w-20 px-2 py-1 text-xs border border-gray-300 rounded text-center"
                            placeholder="선차감"
                          />
                        </td>
                        
                        {/* 정산금액 */}
                        <td className={`px-3 py-3 whitespace-nowrap text-sm font-semibold text-center border-r border-gray-200 ${
                          globalAmountType === 'commission' ? 'text-green-600 bg-green-50' : 'text-green-600'
                        }`}>
                          <div className="flex flex-col">
                            <span className="text-xs text-gray-400">원본: {formatCurrency(item.commission_deduction)}</span>
                            <span className="font-bold">{formatCurrency(getFullyCalculatedCommissionAmount(item, item.id))}</span>
                          </div>
                        </td>
                        
                        {/* 보수액 */}
                        <td className={`px-3 py-3 whitespace-nowrap text-sm font-semibold text-center border-r border-gray-200 ${globalAmountType === 'remuneration' ? 'text-green-600 bg-green-50' : 'text-green-600'}`}>
                          <div className="flex flex-col">
                            <span className="text-xs text-gray-400">원본: {formatCurrency(item.remuneration)}</span>
                            <span className="font-bold">{formatCurrency(getCalculatedAmount(item.remuneration, item.id))}</span>
                          </div>
                        </td>
                        
                        {/* 원천세 계산 (헤더 선택 기준, 계산된 값 기준) */}
                        <td className="px-3 py-3 whitespace-nowrap text-sm text-red-600 font-medium text-center">
                          -{(() => {
                            let calculatedAmount = 0;
                            
                            switch(globalAmountType) {
                              case 'commission':
                                calculatedAmount = getFullyCalculatedCommissionAmount(item, item.id);
                                break;
                              case 'remuneration':
                                calculatedAmount = getCalculatedAmount(item.remuneration, item.id);
                                break;
                            }
                            
                            const withholding = Math.round(calculatedAmount * 0.033);
                            return formatCurrency(withholding);
                          })()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 페이지네이션 */}
              {totalPages > 1 && (
                <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                  <div className="flex-1 flex justify-between sm:hidden">
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400"
                    >
                      이전
                    </button>
                    <button
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400"
                    >
                      다음
                    </button>
                  </div>
                  <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-gray-700">
                        총 <span className="font-medium">{filteredData.length}</span>개 중{' '}
                        <span className="font-medium">{indexOfFirstItem + 1}</span>-
                        <span className="font-medium">{Math.min(indexOfLastItem, filteredData.length)}</span>개 표시
                      </p>
                    </div>
                    <div>
                      <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                        <button
                          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                          disabled={currentPage === 1}
                          className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400"
                        >
                          이전
                        </button>
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                          return (
                            <button
                              key={pageNum}
                              onClick={() => setCurrentPage(pageNum)}
                              className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                currentPage === pageNum
                                  ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                  : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                        <button
                          onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                          disabled={currentPage === totalPages}
                          className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400"
                        >
                          다음
                        </button>
                      </nav>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
} 