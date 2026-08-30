export const mergeOnKey = (primaryRecords, secondaryRecords, joinKey) => {
    const secondaryMap = new Map(
        secondaryRecords.map((record) => [record[joinKey], record])
    );

    return primaryRecords
        .map((primary) => {
            const secondary = secondaryMap.get(primary[joinKey]);
            return secondary ? { ...primary, ...secondary } : null;
        })
        .filter(Boolean);
};