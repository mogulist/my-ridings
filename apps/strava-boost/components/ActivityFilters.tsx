"use client";

import { useEffect, useRef, useState } from "react";
import type { ActivityFilters } from "@/lib/filters";
import { getUniqueBikeTypes, getUniqueSportTypes, getUniqueTrainerTypes } from "@/lib/filters";
import { getGearInfos } from "@/lib/gear-cache";
import { getSportTypeDisplayName } from "@/lib/sport-types";
import type { StravaActivity } from "@/src/types";

type ActivityFiltersProps = {
	activities: StravaActivity[];
	filters: ActivityFilters;
	onFiltersChange: (filters: ActivityFilters) => void;
};

type BikeOption = {
	gear_id: string;
	name: string;
};

type MultiSelectOption = {
	value: string;
	label: string;
};

type MultiSelectProps = {
	options: MultiSelectOption[];
	selectedValues: string[];
	onChange: (values: string[]) => void;
	placeholder: string;
	disabled?: boolean;
};

function MultiSelect({
	options,
	selectedValues,
	onChange,
	placeholder,
	disabled = false,
}: MultiSelectProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [hoveredOption, setHoveredOption] = useState<string | null>(null);
	const containerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
				setIsOpen(false);
			}
		};

		if (isOpen) {
			document.addEventListener("mousedown", handleClickOutside);
		}

		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [isOpen]);

	const toggleOption = (value: string) => {
		if (selectedValues.includes(value)) {
			const newValues = selectedValues.filter((v) => v !== value);
			// 1개만 남은 상태에서 토글하면 전체 선택 (빈 배열)
			if (newValues.length === 0) {
				onChange([]);
			} else {
				onChange(newValues);
			}
		} else {
			// 전체 선택 상태(빈 배열)에서 특정 옵션 선택 시, 해당 옵션만 선택
			if (selectedValues.length === 0) {
				onChange([value]);
			} else {
				onChange([...selectedValues, value]);
			}
		}
	};

	const selectOnly = (value: string) => {
		onChange([value]);
		setIsOpen(false);
	};

	const selectAll = () => {
		onChange([]);
		setIsOpen(false);
	};

	const displayText =
		selectedValues.length === 0
			? placeholder
			: selectedValues.length === 1
				? options.find((opt) => opt.value === selectedValues[0])?.label || selectedValues[0]
				: `${selectedValues.length}개 선택됨`;

	return (
		<div ref={containerRef} className="relative">
			<button
				type="button"
				onClick={() => !disabled && setIsOpen(!isOpen)}
				disabled={disabled}
				className="w-full px-4 py-3 sm:py-2 text-base sm:text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 touch-manipulation bg-white text-left flex items-center justify-between disabled:bg-gray-100 disabled:cursor-not-allowed"
			>
				<span className={selectedValues.length === 0 ? "text-gray-500" : ""}>{displayText}</span>
				<svg
					className={`w-5 h-5 transition-transform ${isOpen ? "transform rotate-180" : ""}`}
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
				</svg>
			</button>

			{isOpen && !disabled && (
				<div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
					{options.length === 0 ? (
						<div className="px-4 py-2 text-sm text-gray-500">옵션이 없습니다</div>
					) : (
						options.map((option) => {
							const isOnlyOneSelected = selectedValues.length === 1;
							const isThisOptionTheOnlySelected =
								isOnlyOneSelected && selectedValues[0] === option.value;
							const showAllButton = isThisOptionTheOnlySelected && hoveredOption === option.value;
							const showOnlyButton = !isThisOptionTheOnlySelected && hoveredOption === option.value;

							return (
								<div
									key={option.value}
									className="relative flex items-center px-4 py-2 hover:bg-gray-50 cursor-pointer group"
									onMouseEnter={() => setHoveredOption(option.value)}
									onMouseLeave={() => setHoveredOption(null)}
								>
									<label
										className="flex items-center flex-1 cursor-pointer"
										onClick={(e) => {
											e.preventDefault();
											toggleOption(option.value);
										}}
									>
										<input
											type="checkbox"
											checked={selectedValues.length === 0 || selectedValues.includes(option.value)}
											onChange={() => toggleOption(option.value)}
											className="w-4 h-4 text-blue-500 border-gray-300 rounded focus:ring-2 focus:ring-blue-500 mr-3"
											onClick={(e) => e.stopPropagation()}
										/>
										<span className="text-sm">{option.label}</span>
									</label>
									{showOnlyButton && (
										<button
											type="button"
											onClick={(e) => {
												e.stopPropagation();
												selectOnly(option.value);
											}}
											className="ml-2 px-2 py-1 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded border border-blue-300 hover:border-blue-400 transition-colors"
										>
											only
										</button>
									)}
									{showAllButton && (
										<button
											type="button"
											onClick={(e) => {
												e.stopPropagation();
												selectAll();
											}}
											className="ml-2 px-2 py-1 text-xs text-green-600 hover:text-green-800 hover:bg-green-50 rounded border border-green-300 hover:border-green-400 transition-colors"
										>
											all
										</button>
									)}
								</div>
							);
						})
					)}
				</div>
			)}
		</div>
	);
}

export function ActivityFilters({ activities, filters, onFiltersChange }: ActivityFiltersProps) {
	const [sportTypes, setSportTypes] = useState<string[]>([]);
	const [bikeTypes, setBikeTypes] = useState<BikeOption[]>([]);
	const [trainerTypes, setTrainerTypes] = useState<string[]>([]);
	const [loadingBikes, setLoadingBikes] = useState(false);

	useEffect(() => {
		const sportTypesList = getUniqueSportTypes(activities);
		setSportTypes(sportTypesList);

		// 트레이너 타입 로드
		const trainerTypesList = getUniqueTrainerTypes(activities);
		setTrainerTypes(trainerTypesList);

		// 자전거 정보 로드
		const loadBikeInfo = async () => {
			const bikeGearIds = getUniqueBikeTypes(activities);
			if (bikeGearIds.length === 0) {
				setBikeTypes([]);
				return;
			}

			setLoadingBikes(true);
			try {
				const gearMap = await getGearInfos(bikeGearIds);
				const bikeOptions: BikeOption[] = bikeGearIds.map((gearId) => {
					const gearInfo = gearMap.get(gearId);
					return {
						gear_id: gearId,
						name: gearInfo?.name || gearId, // 이름이 없으면 gear_id 사용
					};
				});
				setBikeTypes(bikeOptions);
			} catch (error) {
				console.error("자전거 정보 로드 실패:", error);
				// 실패 시 gear_id만 사용
				setBikeTypes(
					bikeGearIds.map((gearId) => ({
						gear_id: gearId,
						name: gearId,
					})),
				);
			} finally {
				setLoadingBikes(false);
			}
		};

		loadBikeInfo();
	}, [activities]);

	const handleSportTypesChange = (values: string[]) => {
		onFiltersChange({
			...filters,
			sportTypes: values.length > 0 ? values : undefined,
		});
	};

	const handleBikeTypesChange = (values: string[]) => {
		onFiltersChange({
			...filters,
			bikeTypes: values.length > 0 ? values : undefined,
		});
	};

	const handleKeywordChange = (value: string) => {
		onFiltersChange({
			...filters,
			keyword: value === "" ? undefined : value,
		});
	};

	const handleIndoorOnlyChange = (checked: boolean) => {
		onFiltersChange({
			...filters,
			indoorOnly: checked ? true : undefined,
		});
	};

	const handleTrainerTypesChange = (values: string[]) => {
		onFiltersChange({
			...filters,
			trainerTypes: values.length > 0 ? values : undefined,
		});
	};

	const clearFilters = () => {
		onFiltersChange({});
	};

	const hasActiveFilters =
		(filters.sportTypes && filters.sportTypes.length > 0) ||
		(filters.bikeTypes && filters.bikeTypes.length > 0) ||
		filters.keyword ||
		filters.indoorOnly ||
		(filters.trainerTypes && filters.trainerTypes.length > 0);

	return (
		<div className="bg-white rounded-lg shadow p-4 sm:p-6">
			<div className="flex items-center justify-between mb-4">
				<h2 className="text-lg sm:text-xl font-semibold">필터</h2>
				{hasActiveFilters && (
					<button
						onClick={clearFilters}
						className="px-3 py-2 text-sm sm:text-base text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors touch-manipulation"
					>
						필터 초기화
					</button>
				)}
			</div>

			<div className="space-y-4">
				{/* 첫 번째 행: 스포츠 종목, 자전거 타입, 키워드 검색 */}
				<div className="space-y-4 lg:space-y-0 lg:grid lg:grid-cols-3 lg:gap-4">
					{/* 스포츠 종목 필터 */}
					<div>
						<label className="block text-sm sm:text-base font-medium text-gray-700 mb-2">
							스포츠 종목
						</label>
						<MultiSelect
							options={sportTypes.map((type) => ({
								value: type,
								label: getSportTypeDisplayName(type),
							}))}
							selectedValues={filters.sportTypes || []}
							onChange={handleSportTypesChange}
							placeholder="전체"
							disabled={activities.length === 0}
						/>
						{activities.length === 0 && (
							<p className="mt-1 text-xs text-gray-500">동기화를 먼저 진행해주세요.</p>
						)}
					</div>

					{/* 자전거 타입 필터 */}
					<div>
						<label className="block text-sm sm:text-base font-medium text-gray-700 mb-2">
							자전거 타입
						</label>
						<MultiSelect
							options={bikeTypes.map((bike) => ({
								value: bike.gear_id,
								label: bike.name,
							}))}
							selectedValues={filters.bikeTypes || []}
							onChange={handleBikeTypesChange}
							placeholder={
								loadingBikes
									? "자전거 정보 로딩 중..."
									: bikeTypes.length === 0
										? "자전거 정보 없음"
										: "전체"
							}
							disabled={activities.length === 0 || loadingBikes}
						/>
						{activities.length === 0 && (
							<p className="mt-1 text-xs text-gray-500">동기화를 먼저 진행해주세요.</p>
						)}
					</div>

					{/* 키워드 검색 */}
					<div>
						<label className="block text-sm sm:text-base font-medium text-gray-700 mb-2">
							키워드 검색
						</label>
						<input
							type="text"
							value={filters.keyword || ""}
							onChange={(e) => handleKeywordChange(e.target.value)}
							placeholder="활동 이름으로 검색..."
							className="w-full px-4 py-3 sm:py-2 text-base sm:text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
						/>
					</div>
				</div>

				{/* 두 번째 행: 인도어 필터, 트레이너 타입 */}
				<div className="space-y-4 lg:space-y-0 lg:grid lg:grid-cols-3 lg:gap-4">
					{/* 인도어 라이딩 필터 */}
					<div>
						<label className="block text-sm sm:text-base font-medium text-gray-700 mb-2">
							라이딩 위치
						</label>
						<label className="flex items-center space-x-2 px-4 py-3 sm:py-2 border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50 touch-manipulation">
							<input
								type="checkbox"
								checked={filters.indoorOnly || false}
								onChange={(e) => handleIndoorOnlyChange(e.target.checked)}
								className="w-5 h-5 text-blue-500 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
							/>
							<span className="text-base sm:text-sm">인도어만 표시</span>
						</label>
					</div>

					{/* 트레이너 타입 필터 */}
					<div className="lg:col-span-2">
						<label className="block text-sm sm:text-base font-medium text-gray-700 mb-2">
							트레이너 종류
						</label>
						<MultiSelect
							options={trainerTypes.map((trainer) => ({
								value: trainer,
								label: trainer,
							}))}
							selectedValues={filters.trainerTypes || []}
							onChange={handleTrainerTypesChange}
							placeholder={trainerTypes.length === 0 ? "트레이너 정보 없음" : "전체"}
							disabled={activities.length === 0 || trainerTypes.length === 0}
						/>
						{activities.length === 0 && (
							<p className="mt-1 text-xs text-gray-500">동기화를 먼저 진행해주세요.</p>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
