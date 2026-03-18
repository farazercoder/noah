import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { COLORS, FONTS, SPACING } from '../utils/constants';
import { SoldListing } from '../types';
import { formatCurrency, formatDate } from '../utils/helpers';

interface Props {
  sales: SoldListing[];
  width?: number;
  height?: number;
}

export function PriceSparkline({ sales, width = 280, height = 80 }: Props) {
  if (sales.length < 2) {
    return (
      <View style={[styles.container, { width, height }]}>
        <Text style={styles.noData}>Not enough data for chart</Text>
      </View>
    );
  }

  const prices = sales.map((s) => s.soldPrice);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const range = maxPrice - minPrice || 1;

  const padding = 8;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2 - 16; // Leave room for labels

  // Build SVG-like path using simple lines
  const points = sales
    .map((sale, index) => {
      const x = padding + (index / (sales.length - 1)) * chartWidth;
      const y = padding + chartHeight - ((sale.soldPrice - minPrice) / range) * chartHeight;
      return { x, y, price: sale.soldPrice, date: sale.soldDate };
    })
    .reverse(); // Oldest first for left-to-right

  // Determine trend color
  const firstPrice = points[0]?.price || 0;
  const lastPrice = points[points.length - 1]?.price || 0;
  const trendColor = lastPrice >= firstPrice ? COLORS.priceUp : COLORS.priceDown;

  return (
    <View style={[styles.container, { width, height }]}>
      {/* Y-axis labels */}
      <Text style={[styles.axisLabel, { top: padding - 4 }]}>
        {formatCurrency(maxPrice)}
      </Text>
      <Text style={[styles.axisLabel, { bottom: 16 }]}>
        {formatCurrency(minPrice)}
      </Text>

      {/* Chart area */}
      <View style={[styles.chartArea, { height: chartHeight, marginTop: padding }]}>
        {/* Grid lines */}
        <View style={[styles.gridLine, { top: 0 }]} />
        <View style={[styles.gridLine, { top: chartHeight / 2 }]} />
        <View style={[styles.gridLine, { bottom: 0 }]} />

        {/* Data points and connecting lines */}
        {points.map((point, index) => (
          <React.Fragment key={index}>
            {/* Dot */}
            <View
              style={[
                styles.dot,
                {
                  left: point.x - 3,
                  top: point.y - padding - 3,
                  backgroundColor: trendColor,
                },
              ]}
            />

            {/* Connecting line segment (rendered as a thin view) */}
            {index < points.length - 1 && (
              <View
                style={[
                  styles.lineSegment,
                  {
                    left: point.x,
                    top: Math.min(point.y, points[index + 1].y) - padding,
                    width: points[index + 1].x - point.x,
                    height: Math.max(1, Math.abs(points[index + 1].y - point.y)),
                    backgroundColor: trendColor,
                    opacity: 0.4,
                  },
                ]}
              />
            )}
          </React.Fragment>
        ))}
      </View>

      {/* X-axis: date range */}
      <View style={styles.dateRow}>
        <Text style={styles.dateLabel}>
          {points.length > 0 ? formatDate(points[0].date) : ''}
        </Text>
        <Text style={styles.dateLabel}>
          {points.length > 0 ? formatDate(points[points.length - 1].date) : ''}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 8,
    overflow: 'hidden',
  },
  noData: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.xs,
    textAlign: 'center',
    marginTop: 30,
  },
  chartArea: {
    position: 'relative',
    marginHorizontal: 40,
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: COLORS.cardBorder,
  },
  dot: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  lineSegment: {
    position: 'absolute',
    borderRadius: 1,
  },
  axisLabel: {
    position: 'absolute',
    left: 4,
    fontSize: 9,
    color: COLORS.textMuted,
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 40,
    marginTop: 2,
  },
  dateLabel: {
    fontSize: 9,
    color: COLORS.textMuted,
  },
});
