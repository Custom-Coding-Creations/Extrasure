export function getNextSlotIndex(currentIndex: number, total: number, key: string) {
  if (total <= 0) {
    return -1;
  }

  if (key === "Home") {
    return 0;
  }

  if (key === "End") {
    return total - 1;
  }

  if (key === "ArrowRight" || key === "ArrowDown") {
    return (currentIndex + 1 + total) % total;
  }

  if (key === "ArrowLeft" || key === "ArrowUp") {
    return (currentIndex - 1 + total) % total;
  }

  return currentIndex;
}
