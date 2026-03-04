function calculateOutlier(ratings) {
    // ratings: [ { id, username, rating } ]

    if (!ratings || ratings.length === 0) return null;

    // 1. Calculate Average
    const sum = ratings.reduce((acc, curr) => acc + curr.rating, 0);
    const average = sum / ratings.length;

    // 2. Find Outlier (Max deviation from average)
    let maxDiff = -1;
    let outlier = null;

    ratings.forEach(p => {
        const diff = Math.abs(p.rating - average);
        if (diff > maxDiff) {
            maxDiff = diff;
            outlier = p;
        } else if (diff === maxDiff) {
            // Tie-breaking: In a real game, maybe random or both?
            // For now, keep the first one found or we could return an array.
        }
    });

    return {
        average: parseFloat(average.toFixed(2)),
        outlier,
        maxDiff: parseFloat(maxDiff.toFixed(2)),
        allRatings: ratings.sort((a, b) => b.rating - a.rating) // Sorted for display
    };
}

module.exports = { calculateOutlier };
