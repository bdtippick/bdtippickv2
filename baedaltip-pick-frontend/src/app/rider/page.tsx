"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";

interface RiderSettlement {
  id: number;
  rider_id: string;
  settlement_year: number;
  settlement_month: number;
  settlement_week: number;
  total_orders: number;
  settlement_amount: number;
  support_fund: number;
  deduction_details: number;
  employment_insurance: number;
  industrial_accident_insurance: number;
  hourly_insurance: number;
  retroactive_insurance: number;
  mission_fee: number;
  pre_deduction: number;
  final_settlement_amount: number;
  withholding_tax: number;
  actual_payment_amount: number;
  created_at: string;
}

interface SupportFund {
  id: number;
  rider_id: string;
  date: string;
  rider_name: string;
  store_name: string;
  amount: number;
}

interface AdditionalSupportFund {
  id: number;
  rider_id: string;
  date: string;
  rider_name: string;
  type: string;
  amount: number;
}

interface Deduction {
  id: number;
  rider_id: string;
  date: string;
  rider_name: string;
  type: string;
  store_name: string;
  amount: number;
}

export default function RiderDashboard() {
  const [selectedWeek, setSelectedWeek] = useState<string>('');
  const [riderId, setRiderId] = useState<string>('');
  const [settlementData, setSettlementData] = useState<RiderSettlement | null>(null);
  const [supportFunds, setSupportFunds] = useState<SupportFund[]>([]);
  const [additionalSupportFunds, setAdditionalSupportFunds] = useState<AdditionalSupportFund[]>([]);
  const [deductions, setDeductions] = useState<Deduction[]>([]);
  const [loading, setLoading] = useState(false);
  const [weekOptions, setWeekOptions] = useState<Array<{value: string, label: string}>>([]);

  // 주차 옵션 로드
  useEffect(() => {
    fetchWeekOptions();
  }, []);

  const fetchWeekOptions = async () => {
    try {
      const { data, error } = await supabase
        .from('rider_settlements')
        .select('settlement_year, settlement_month, settlement_week')
        .order('settlement_year', { ascending: false })
        .order('settlement_month', { ascending: false })
        .order('settlement_week', { ascending: false });

      if (error) {
        console.error('주차 옵션 로드 실패:', error);
        return;
      }

      // 중복 제거 및 옵션 생성
      const uniqueWeeks = Array.from(
        new Set(data?.map(item => `${item.settlement_year}-${item.settlement_month}-${item.settlement_week}`))
      ).map(weekStr => {
        const [year, month, week] = weekStr.split('-');
        return {
          value: weekStr,
          label: `${year}년 ${month}월 ${week}주차`
        };
      });

      setWeekOptions(uniqueWeeks);
      
      // 첫 번째 주차를 기본 선택
      if (uniqueWeeks.length > 0) {
        setSelectedWeek(uniqueWeeks[0].value);
      }

    } catch (error) {
      console.error('주차 옵션 로드 중 에러:', error);
    }
  };

  const searchRiderData = async () => {
    if (!selectedWeek || !riderId.trim()) {
      alert('주차를 선택하고 라이더 ID를 입력해주세요.');
      return;
    }

    setLoading(true);
    setSettlementData(null);
    setSupportFunds([]);
    setAdditionalSupportFunds([]);
    setDeductions([]);

    try {
      const [year, month, week] = selectedWeek.split('-');
      
      // 정산 데이터 조회
      const { data: settlementResult, error: settlementError } = await supabase
        .from('rider_settlements')
        .select('*')
        .eq('settlement_year', parseInt(year))
        .eq('settlement_month', parseInt(month))
        .eq('settlement_week', parseInt(week))
        .eq('rider_id', riderId.trim())
        .single();

      if (settlementError) {
        if (settlementError.code === 'PGRST116') {
          alert('해당 주차에 정산 데이터가 없습니다.\n라이더 ID를 확인하거나 다른 주차를 선택해주세요.');
        } else {
          console.error('정산 데이터 조회 실패:', settlementError);
          alert('정산 데이터 조회 중 오류가 발생했습니다.');
        }
        return;
      }

      setSettlementData(settlementResult);

      // 지원금 상세 데이터 조회
      const { data: supportFundsResult, error: supportFundsError } = await supabase
        .from('support_funds')
        .select('*')
        .eq('settlement_year', parseInt(year))
        .eq('settlement_month', parseInt(month))
        .eq('settlement_week', parseInt(week))
        .eq('rider_id', riderId.trim())
        .order('date', { ascending: true });

      if (supportFundsError) {
        console.error('지원금 데이터 조회 실패:', supportFundsError);
      } else {
        setSupportFunds(supportFundsResult || []);
      }

      // 추가지원금 상세 데이터 조회
      const { data: additionalSupportResult, error: additionalSupportError } = await supabase
        .from('additional_support_funds')
        .select('*')
        .eq('settlement_year', parseInt(year))
        .eq('settlement_month', parseInt(month))
        .eq('settlement_week', parseInt(week))
        .eq('rider_id', riderId.trim())
        .order('date', { ascending: true });

      if (additionalSupportError) {
        console.error('추가지원금 데이터 조회 실패:', additionalSupportError);
      } else {
        setAdditionalSupportFunds(additionalSupportResult || []);
      }

      // 차감내역 상세 데이터 조회
      const { data: deductionsResult, error: deductionsError } = await supabase
        .from('deductions')
        .select('*')
        .eq('settlement_year', parseInt(year))
        .eq('settlement_month', parseInt(month))
        .eq('settlement_week', parseInt(week))
        .eq('rider_id', riderId.trim())
        .order('date', { ascending: true });

      if (deductionsError) {
        console.error('차감내역 데이터 조회 실패:', deductionsError);
      } else {
        setDeductions(deductionsResult || []);
      }

    } catch (error) {
      console.error('검색 중 에러:', error);
      alert('검색 중 예상치 못한 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (num: number) => {
    return new Intl.NumberFormat('ko-KR').format(num);
  };

  const getWeekPeriod = () => {
    if (!selectedWeek) return '';
    
    const [year, month, week] = selectedWeek.split('-');
    // 실제 날짜 계산은 복잡하므로 임시로 표시
    return `${month}월 ${parseInt(week) * 7 - 6}일(수) ~ ${month}월 ${parseInt(week) * 7}일(화)`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">이번주 수입 내역</h1>
              <p className="text-gray-600 mt-1">라이더스 ID로 본인의 급여 데이터를 확인하세요</p>
            </div>
            <Link 
              href="/"
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              홈으로 돌아가기
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 주차 선택 섹션 */}
        <div className="bg-green-600 text-white rounded-lg p-6 mb-6">
          <div className="flex items-center mb-4">
            <svg className="w-6 h-6 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
            </svg>
            <h2 className="text-xl font-bold">조회할 주차를 선택하세요</h2>
          </div>
          
          <select
            value={selectedWeek}
            onChange={(e) => setSelectedWeek(e.target.value)}
            className="w-full px-4 py-3 text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
          >
            <option value="">주차를 선택하세요</option>
            {weekOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          {selectedWeek && (
            <div className="mt-4 p-3 bg-green-500 rounded-lg">
              <p className="text-sm font-medium">정산 기간</p>
              <p className="text-lg font-bold">{getWeekPeriod()}</p>
            </div>
          )}
        </div>

        {/* 라이더 ID 입력 섹션 */}
        <div className="bg-blue-600 text-white rounded-lg p-6 mb-6">
          <div className="flex items-center mb-4">
            <svg className="w-6 h-6 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
            </svg>
            <h2 className="text-xl font-bold">라이더스 ID를 입력하세요</h2>
          </div>

          <div className="flex space-x-3">
            <input
              type="text"
              value={riderId}
              onChange={(e) => setRiderId(e.target.value)}
              placeholder="라이더 ID를 입력하세요"
              className="flex-1 px-4 py-3 text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  searchRiderData();
                }
              }}
            />
            <button
              onClick={searchRiderData}
              disabled={loading || !selectedWeek || !riderId.trim()}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-400 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>검색중</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <span>조회</span>
                </>
              )}
            </button>
          </div>

          <div className="mt-4 text-center">
            <p className="text-sm">라이더 ID를 입력하고 조회해주세요</p>
            <p className="text-xs mt-1">본인의 라이더스 ID를 입력하여 급여 기록을 확인하세요</p>
          </div>
        </div>

        {/* 정산 데이터 표시 */}
        {settlementData && (
          <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">시원컵떠니</h2>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-2 gap-6">
                {/* 왼쪽 컬럼 */}
                <div className="space-y-6">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-sm font-medium text-blue-600">성함</p>
                    <p className="text-2xl font-bold text-blue-900">{settlementData.rider_id}</p>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm font-medium text-gray-600">차감내역</p>
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(Math.abs(settlementData.deduction_details))} 원</p>
                  </div>

                  <div className="bg-red-50 p-4 rounded-lg">
                    <p className="text-sm font-medium text-red-600">기사부담 고용보험</p>
                    <p className="text-2xl font-bold text-red-900">-{formatCurrency(Math.abs(settlementData.employment_insurance))} 원</p>
                  </div>

                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <p className="text-sm font-medium text-yellow-600">시간제보험</p>
                    <p className="text-2xl font-bold text-yellow-900">-{formatCurrency(Math.abs(settlementData.hourly_insurance))} 원</p>
                  </div>

                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <p className="text-sm font-medium text-yellow-600">리스비</p>
                    <p className="text-2xl font-bold text-yellow-900">{formatCurrency(settlementData.mission_fee)} 원</p>
                  </div>

                  <div className="bg-green-50 p-4 rounded-lg">
                    <p className="text-sm font-medium text-green-600">정산금액</p>
                    <p className="text-2xl font-bold text-green-900">{formatCurrency(settlementData.final_settlement_amount)} 원</p>
                  </div>
                </div>

                {/* 오른쪽 컬럼 */}
                <div className="space-y-6">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-sm font-medium text-blue-600">총 정산 오더수</p>
                    <p className="text-2xl font-bold text-blue-900">{settlementData.total_orders}</p>
                  </div>

                  <div className="bg-green-50 p-4 rounded-lg">
                    <p className="text-sm font-medium text-green-600">총 지원금</p>
                    <p className="text-2xl font-bold text-green-900">{formatCurrency(settlementData.support_fund)} 원</p>
                  </div>

                  <div className="bg-red-50 p-4 rounded-lg">
                    <p className="text-sm font-medium text-red-600">기사부담 산재보험</p>
                    <p className="text-2xl font-bold text-red-900">-{formatCurrency(Math.abs(settlementData.industrial_accident_insurance))} 원</p>
                  </div>

                  <div className="bg-purple-50 p-4 rounded-lg">
                    <p className="text-sm font-medium text-purple-600">보험료 소급</p>
                    <p className="text-2xl font-bold text-purple-900">{formatCurrency(settlementData.retroactive_insurance)} 원</p>
                  </div>

                  <div className="bg-purple-50 p-4 rounded-lg">
                    <p className="text-sm font-medium text-purple-600">미션비</p>
                    <p className="text-2xl font-bold text-purple-900">{formatCurrency(settlementData.pre_deduction)} 원</p>
                  </div>

                  <div className="bg-red-50 p-4 rounded-lg">
                    <p className="text-sm font-medium text-red-600">원천세 (3.3%)</p>
                    <p className="text-2xl font-bold text-red-900">{formatCurrency(settlementData.withholding_tax)} 원</p>
                  </div>
                </div>
              </div>

              {/* 최종 지급액 */}
              <div className="mt-8 bg-blue-600 text-white rounded-lg p-6">
                <div className="text-center">
                  <p className="text-lg font-medium">입금받으실금액</p>
                  <p className="text-4xl font-bold mt-2">{formatCurrency(settlementData.actual_payment_amount)} 원</p>
                </div>
              </div>

              {/* 상세 내역 섹션 */}
              <div className="mt-8 space-y-6">
                {/* 지원금 상세 내역 */}
                {supportFunds.length > 0 && (
                  <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
                    <div className="bg-green-50 px-6 py-4 border-b border-gray-200">
                      <h3 className="text-lg font-bold text-green-800">지원금 상세 내역</h3>
                      <p className="text-sm text-green-600">총 {supportFunds.length}건</p>
                    </div>
                    <div className="p-6">
                      <div className="overflow-x-auto">
                        <table className="min-w-full">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">날짜</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">스토어명</th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">금액</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {supportFunds.map((item, index) => (
                              <tr key={index} className="hover:bg-gray-50">
                                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {item.date ? new Date(item.date).toLocaleDateString('ko-KR') : '-'}
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {item.store_name || '-'}
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-green-600 text-right">
                                  +{formatCurrency(item.amount)} 원
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="bg-green-50">
                            <tr>
                              <td colSpan={2} className="px-4 py-3 text-sm font-medium text-green-800">
                                지원금 합계
                              </td>
                              <td className="px-4 py-3 text-sm font-bold text-green-800 text-right">
                                +{formatCurrency(supportFunds.reduce((sum, item) => sum + item.amount, 0))} 원
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* 추가지원금 상세 내역 */}
                {additionalSupportFunds.length > 0 && (
                  <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
                    <div className="bg-blue-50 px-6 py-4 border-b border-gray-200">
                      <h3 className="text-lg font-bold text-blue-800">추가지원금 상세 내역</h3>
                      <p className="text-sm text-blue-600">총 {additionalSupportFunds.length}건</p>
                    </div>
                    <div className="p-6">
                      <div className="overflow-x-auto">
                        <table className="min-w-full">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">날짜</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">구분</th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">금액</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {additionalSupportFunds.map((item, index) => (
                              <tr key={index} className="hover:bg-gray-50">
                                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {item.date ? new Date(item.date).toLocaleDateString('ko-KR') : '-'}
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {item.type || '-'}
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-blue-600 text-right">
                                  +{formatCurrency(item.amount)} 원
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="bg-blue-50">
                            <tr>
                              <td colSpan={2} className="px-4 py-3 text-sm font-medium text-blue-800">
                                추가지원금 합계
                              </td>
                              <td className="px-4 py-3 text-sm font-bold text-blue-800 text-right">
                                +{formatCurrency(additionalSupportFunds.reduce((sum, item) => sum + item.amount, 0))} 원
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* 차감내역 상세 내역 */}
                {deductions.length > 0 && (
                  <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
                    <div className="bg-red-50 px-6 py-4 border-b border-gray-200">
                      <h3 className="text-lg font-bold text-red-800">차감내역 상세 내역</h3>
                      <p className="text-sm text-red-600">총 {deductions.length}건</p>
                    </div>
                    <div className="p-6">
                      <div className="overflow-x-auto">
                        <table className="min-w-full">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">날짜</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">구분</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">스토어명</th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">금액</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {deductions.map((item, index) => (
                              <tr key={index} className="hover:bg-gray-50">
                                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {item.date ? new Date(item.date).toLocaleDateString('ko-KR') : '-'}
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {item.type || '-'}
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {item.store_name || '-'}
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-red-600 text-right">
                                  -{formatCurrency(Math.abs(item.amount))} 원
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="bg-red-50">
                            <tr>
                              <td colSpan={3} className="px-4 py-3 text-sm font-medium text-red-800">
                                차감내역 합계
                              </td>
                              <td className="px-4 py-3 text-sm font-bold text-red-800 text-right">
                                -{formatCurrency(Math.abs(deductions.reduce((sum, item) => sum + item.amount, 0)))} 원
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* 상세 내역이 없는 경우 안내 메시지 */}
                {supportFunds.length === 0 && additionalSupportFunds.length === 0 && deductions.length === 0 && (
                  <div className="bg-gray-50 rounded-lg p-8 text-center">
                    <div className="text-gray-400 mb-4">
                      <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <p className="text-gray-600 font-medium">상세 내역이 없습니다</p>
                    <p className="text-gray-500 text-sm mt-1">해당 주차에 지원금, 추가지원금, 차감내역이 없습니다.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 