import axios from "axios";
import { scrapeRecord } from "./marazone_crawler";

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("marazone_crawler", () => {
  it("should set dns status when no start time", async () => {
    mockedAxios.post.mockResolvedValueOnce({
      data: [
        {
          Competition: "트렉가평자라섬그란폰도",
          Bib: "1003",
          Name: "테스트",
          Division: "그란폰도",
          Time: "-",
          Sex: "M",
          Net_start: "-",
          Net_finish: "-",
          Pace: "-",
          Speed: "-",
          A_rank: "-",
          G_rank: "-",
          O_rank: "-",
          Sa: "0",
          KOM_NAME: "KOM",
          KOM_TIME: "-",
          DOWN_SPEED_NAME: "Down_speed",
          DOWN_SPEED_TIME: "-",
          CP_01_TOD: "-",
          CP_01_TIME: "-",
          CP_01_NAME: "kom_start",
          CP_02_TOD: "-",
          CP_02_TIME: "-",
          CP_02_NAME: "kom_finish",
          CP_03_TOD: "-",
          CP_03_TIME: "-",
          CP_03_NAME: "down_start",
          CP_04_TOD: "-",
          CP_04_TIME: "-",
          CP_04_NAME: "down_finish",
          CP_05_TOD: "-",
          CP_05_TIME: "-",
          CP_05_NAME: "G_77.8km",
        },
      ],
    });

    const result = await scrapeRecord("트렉가평자라섬", "2025", 1003);
    expect(result.Status).toBe("DNS");
    expect(result.Name).toBe("테스트");
    expect(result.Pace).toBe("-");
    expect(result.Speed).toBe("-");
  });

  it("should set dnf status when has start time but no finish time", async () => {
    mockedAxios.post.mockResolvedValueOnce({
      data: [
        {
          Competition: "트렉가평자라섬그란폰도",
          Bib: "1004",
          Name: "테스트",
          Division: "그란폰도",
          Time: "-",
          Sex: "M",
          Net_start: "08:03:35",
          Net_finish: "-",
          Pace: "-",
          Speed: "-",
          A_rank: "-",
          G_rank: "-",
          O_rank: "-",
          Sa: "0",
          KOM_NAME: "KOM",
          KOM_TIME: "-",
          DOWN_SPEED_NAME: "Down_speed",
          DOWN_SPEED_TIME: "-",
          CP_01_TOD: "-",
          CP_01_TIME: "-",
          CP_01_NAME: "kom_start",
          CP_02_TOD: "-",
          CP_02_TIME: "-",
          CP_02_NAME: "kom_finish",
          CP_03_TOD: "-",
          CP_03_TIME: "-",
          CP_03_NAME: "down_start",
          CP_04_TOD: "-",
          CP_04_TIME: "-",
          CP_04_NAME: "down_finish",
          CP_05_TOD: "-",
          CP_05_TIME: "-",
          CP_05_NAME: "G_77.8km",
        },
      ],
    });

    const result = await scrapeRecord("트렉가평자라섬", "2025", 1004);
    expect(result.Status).toBe("DNF");
    expect(result.Name).toBe("테스트");
    expect(result.Pace).toBe("-");
    expect(result.Speed).toBe("-");
  });

  it("should set empty status when has complete record", async () => {
    mockedAxios.post.mockResolvedValueOnce({
      data: [
        {
          Competition: "트렉가평자라섬그란폰도",
          Bib: "1005",
          Name: "테스트",
          Division: "그란폰도",
          Time: "04:01:41",
          Sex: "M",
          Net_start: "08:04:39",
          Net_finish: "12:06:19",
          Pace: "2:59min/km",
          Speed: "20.0km/h",
          A_rank: "-",
          G_rank: "-",
          O_rank: "-",
          Sa: "0",
          KOM_NAME: "KOM",
          KOM_TIME: "00:34:56",
          DOWN_SPEED_NAME: "Down_speed",
          DOWN_SPEED_TIME: "43.3 km/h",
          CP_01_TOD: "09:08:05",
          CP_01_TIME: "01:04:48",
          CP_01_NAME: "kom_start",
          CP_02_TOD: "09:43:01",
          CP_02_TIME: "01:39:44",
          CP_02_NAME: "kom_finish",
          CP_03_TOD: "09:52:09",
          CP_03_TIME: "01:48:52",
          CP_03_NAME: "down_start",
          CP_04_TOD: "10:02:23",
          CP_04_TIME: "01:59:06",
          CP_04_NAME: "down_finish",
          CP_05_TOD: "12:13:00",
          CP_05_TIME: "04:09:43",
          CP_05_NAME: "G_77.8km",
        },
      ],
    });

    const result = await scrapeRecord("트렉가평자라섬", "2025", 1005);
    expect(result.Status).toBe("");
    expect(result.Name).toBe("테스트");
    expect(result.Pace).toBe("2:59min/km");
    expect(result.Speed).toBe("20.0km/h");
    expect(result.KOM_TIME).toBe("00:34:56");
    expect(result.DOWN_SPEED_TIME).toBe("43.3 km/h");
  });
});
