import { useState, useEffect } from 'react';
import { Calendar } from '../../../components/ui/calendar';
import {Card, CardContent, CardFooter, CardHeader, CardTitle} from '../../../components/ui/card';
import { Loader2 } from 'lucide-react';
import { apiFetch } from '../../../lib/api';
import { format, startOfMonth, endOfMonth } from 'date-fns';

interface DailyCoverage {
    day: string;
    has_data: boolean;
}

interface CoverageCalendarProps {
    probeId: string;
    yearMonth: Date;
    onDateSelect: (date: Date) => void;
}

export function CoverageCalendar({ probeId, yearMonth, onDateSelect }: CoverageCalendarProps) {
    const [coverage, setCoverage] = useState<Map<string, boolean>>(new Map());
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [month, setMonth] = useState<Date>(yearMonth);

    useEffect(() => {
        const start = startOfMonth(month).toISOString();
        const end = endOfMonth(month).toISOString();
        const url = `/api/v1/analytics/coverage?probe_id=${probeId}&start_time=${start}&end_time=${end}`;

        setLoading(true);
        setError(null);

        apiFetch(url)
            .then((data: DailyCoverage[]) => {
                if (!data || !Array.isArray(data)) {
                    console.warn('Coverage API returned invalid data:', data);
                    setError('No coverage data available');
                    setCoverage(new Map());
                    return;
                }
                const map = new Map();
                data.forEach(item => map.set(item.day.split('T')[0], item.has_data));
                setCoverage(map);
            })
            .catch((err) => {
                console.error('Coverage API error:', err);
                setError('Failed to load coverage data');
                setCoverage(new Map());
            })
            .finally(() => setLoading(false));
    }, [probeId, month]);

    if (loading) {
        return (
            <Card>
                <CardContent className="flex justify-center p-6">
                    <Loader2 className="h-6 w-6 animate-spin" />
                </CardContent>
            </Card>
        );
    }

    if (error) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="text-sm font-medium">Data Coverage</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-center text-muted-foreground text-sm p-4">
                        {error}<br />
                        <span className="text-xs">The coverage endpoint may not be implemented on the server.</span>
                    </div>
                </CardContent>
            </Card>
        );
    }

    // Custom day renderer to add colored dots
    const renderDay = (date: Date) => {
        const dateStr = format(date, 'yyyy-MM-dd');
        const hasData = coverage.get(dateStr);
        const dayNumber = date.getDate();
        return (
            <div className="relative flex flex-col items-center justify-center w-full h-full">
                <span>{dayNumber}</span>
                {hasData !== undefined && (
                    <div className={`absolute bottom-1 w-1.5 h-1.5 rounded-full ${hasData ? 'bg-green-500' : 'bg-red-500'}`} />
                )}
            </div>
        );
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-2xl font-medium">Data Coverage</CardTitle>
            </CardHeader>
            <CardContent>
                <Calendar
                    mode="single"
                    selected={yearMonth}
                    onSelect={(date) => date && onDateSelect(date)}
                    month={month}
                    onMonthChange={setMonth}
                    components={{
                        DayContent: ({ date }) => renderDay(date),
                    }}
                    className="rounded-md border-0"
                />
            </CardContent>
            <CardFooter className="text-sm font-small text-gray-500">Click on a date to view the hourly chart</CardFooter>
        </Card>
    );
}